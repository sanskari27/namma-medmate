package com.nammamedmate.server.feature.dpdp;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nammamedmate.server.AbstractIntegrationTest;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.BranchStatus;
import com.nammamedmate.server.domain.BranchType;
import com.nammamedmate.server.domain.Customer;
import com.nammamedmate.server.domain.DiscountApprovalStatus;
import com.nammamedmate.server.domain.DiscountType;
import com.nammamedmate.server.domain.DpdpPolicy;
import com.nammamedmate.server.domain.EinvoiceApplicability;
import com.nammamedmate.server.domain.EinvoiceStatus;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.SalesInvoice;
import com.nammamedmate.server.domain.SalesInvoiceStatus;
import com.nammamedmate.server.domain.SubscriptionStatus;
import com.nammamedmate.server.domain.TaxJurisdiction;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TenantStatus;
import com.nammamedmate.server.domain.TenantSubscription;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.CustomerRepository;
import com.nammamedmate.server.persistence.DpdpRequestRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.SalesInvoiceRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.persistence.TenantSubscriptionRepository;
import com.nammamedmate.server.persistence.UserSessionRepository;
import jakarta.servlet.http.Cookie;
import java.time.Instant;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

class DpdpRequestTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-20T02:00:00Z");

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private UserSessionRepository userSessionRepository;
  @Autowired private TenantSubscriptionRepository tenantSubscriptionRepository;
  @Autowired private CustomerRepository customerRepository;
  @Autowired private LocationRepository locationRepository;
  @Autowired private SalesInvoiceRepository salesInvoiceRepository;
  @Autowired private DpdpRequestRepository dpdpRequestRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @BeforeEach
  void wipe() {
    dpdpRequestRepository.deleteAll();
    salesInvoiceRepository.deleteAll();
    customerRepository.deleteAll();
    locationRepository.deleteAll();
    userSessionRepository.deleteAll();
    tenantSubscriptionRepository.deleteAll();
    appUserRepository.deleteAll();
    tenantRepository.deleteAll();
  }

  @Test
  void ac01_ownerReadsApprovedControlMatrix() throws Exception {
    seedOwner("matrix");
    Cookie owner = login("owner@matrix.local");
    mockMvc
        .perform(get("/api/v1/dpdp/matrix").cookie(owner))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data.categories.length()").value(6))
        .andExpect(jsonPath("$.data.categories[0].purpose").isNotEmpty())
        .andExpect(jsonPath("$.data.categories[0].accessRole").isNotEmpty())
        .andExpect(jsonPath("$.data.categories[0].retentionErasure").isNotEmpty())
        .andExpect(jsonPath("$.data.categories[0].exportRule").isNotEmpty())
        .andExpect(jsonPath("$.data.categories[0].accountableOwner").isNotEmpty());
  }

  @Test
  void ac02_verifiedRequestIsTenantScopedWithThirtyDayDeadline() throws Exception {
    Fixture fx = seedOwner("req");
    Cookie owner = login("owner@req.local");
    Customer customer = persistCustomer(fx.tenantId, "Ravi", "9876500101");

    UUID id = create(owner, customer.getId(), "ACCESS");
    mockMvc
        .perform(
            post("/api/v1/dpdp/requests/" + id + "/accept")
                .cookie(owner)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"identityMethod\":\"Checked phone at the counter\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("ACCEPTED"))
        .andExpect(jsonPath("$.data.identityAttestedBy").isNotEmpty())
        .andExpect(jsonPath("$.data.deadlineAt").isNotEmpty());

    JsonNode accepted =
        objectMapper.readTree(
            mockMvc
                .perform(get("/api/v1/dpdp/requests/" + id).cookie(owner))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString());
    Instant acceptedAt = Instant.parse(accepted.path("data").path("acceptedAt").asText());
    Instant deadline = Instant.parse(accepted.path("data").path("deadlineAt").asText());
    assertThat(deadline).isEqualTo(acceptedAt.plus(DpdpPolicy.DECISION_DEADLINE));

    mockMvc
        .perform(
            post("/api/v1/dpdp/requests/" + id + "/decide")
                .cookie(owner)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"decision\":\"FULFILLED\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("FULFILLED"))
        .andExpect(
            jsonPath("$.data.exportJson").value(org.hamcrest.Matchers.containsString("Ravi")))
        .andExpect(
            jsonPath("$.data.exportJson")
                .value(
                    org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("password"))));

    Cookie other = seedOtherOwner();
    mockMvc
        .perform(get("/api/v1/dpdp/requests/" + id).cookie(other))
        .andExpect(status().isNotFound());
  }

  @Test
  void ac03_erasureKeepsLegalInvoiceFactsAndClearsOptionalCrm() throws Exception {
    Fixture fx = seedOwner("erase");
    Cookie owner = login("owner@erase.local");
    Customer customer = persistCustomer(fx.tenantId, "Meera", "9876500202");
    customer.setEmail("meera@example.com");
    customer.setAllergies("Penicillin");
    customerRepository.save(customer);
    persistInvoice(fx.tenantId, fx.branchId, fx.userId, customer.getId());

    UUID id = create(owner, customer.getId(), "ERASURE");
    accept(owner, id);
    mockMvc
        .perform(
            post("/api/v1/dpdp/requests/" + id + "/decide")
                .cookie(owner)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"decision\":\"FULFILLED\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.legalRetention").value(true))
        .andExpect(jsonPath("$.data.decisionReason").value("LEGAL_RETENTION"));

    Customer stored = customerRepository.findById(customer.getId()).orElseThrow();
    assertThat(stored.getName()).isEqualTo("Meera");
    assertThat(stored.getPhone()).isEqualTo("9876500202");
    assertThat(stored.getEmail()).isNull();
    assertThat(stored.getAllergies()).isNull();
    assertThat(salesInvoiceRepository.countByTenantIdAndCustomerId(fx.tenantId, customer.getId()))
        .isEqualTo(1);
  }

  @Test
  void ac04_crossChannelExportOmitsSecretsAndStaffIsDenied() throws Exception {
    Fixture fx = seedOwner("min");
    persistUser(fx.tenantId, "staff@min.local", AppUserRole.pharmacy_staff);
    Cookie staff = login("staff@min.local");
    mockMvc.perform(get("/api/v1/dpdp/matrix").cookie(staff)).andExpect(status().isForbidden());
    mockMvc.perform(get("/api/v1/dpdp/requests").cookie(staff)).andExpect(status().isForbidden());
  }

  @Test
  void ac02_walkInCreatesCustomerThenExport() throws Exception {
    seedOwner("walk");
    Cookie owner = login("owner@walk.local");
    String body =
        mockMvc
            .perform(
                post("/api/v1/dpdp/requests")
                    .cookie(owner)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "principalType":"CUSTOMER",
                          "requestType":"EXPORT",
                          "submittedName":"Walk In",
                          "submittedPhone":"9000011111"
                        }
                        """))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    UUID id = UUID.fromString(objectMapper.readTree(body).path("data").path("id").asText());
    accept(owner, id);
    mockMvc
        .perform(
            post("/api/v1/dpdp/requests/" + id + "/decide")
                .cookie(owner)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"decision\":\"FULFILLED\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.principalId").isNotEmpty())
        .andExpect(
            jsonPath("$.data.exportJson").value(org.hamcrest.Matchers.containsString("Walk In")));
  }

  @Test
  void ac02_existingPhoneBindsWithoutDuplicateCustomer() throws Exception {
    Fixture fx = seedOwner("bind");
    Cookie owner = login("owner@bind.local");
    Customer customer = persistCustomer(fx.tenantId, "Ravi", "9000011111");
    String body =
        mockMvc
            .perform(
                post("/api/v1/dpdp/requests")
                    .cookie(owner)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "principalType":"CUSTOMER",
                          "requestType":"EXPORT",
                          "submittedName":"Ravi",
                          "submittedPhone":"9000011111"
                        }
                        """))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    UUID id = UUID.fromString(objectMapper.readTree(body).path("data").path("id").asText());
    accept(owner, id);
    mockMvc
        .perform(
            post("/api/v1/dpdp/requests/" + id + "/decide")
                .cookie(owner)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"decision\":\"FULFILLED\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.principalId").value(customer.getId().toString()));
    assertThat(customerRepository.findAllByTenantIdAndDeletedAtIsNullOrderByNameAsc(fx.tenantId))
        .hasSize(1);
  }

  @Test
  void ac02_correctionUpdatesCustomerProfile() throws Exception {
    Fixture fx = seedOwner("corr");
    Cookie owner = login("owner@corr.local");
    Customer customer = persistCustomer(fx.tenantId, "Old Name", "9876500303");
    UUID id = create(owner, customer.getId(), "CORRECTION");
    accept(owner, id);
    mockMvc
        .perform(
            post("/api/v1/dpdp/requests/" + id + "/decide")
                .cookie(owner)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"decision\":\"FULFILLED\",\"correction\":{\"name\":\"New Name\"}}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("FULFILLED"));
    assertThat(customerRepository.findById(customer.getId()).orElseThrow().getName())
        .isEqualTo("New Name");
  }

  @Test
  void ac02_masterHandlesPlatformAccount() throws Exception {
    persistUser(null, "ops@hq.local", AppUserRole.admin_super);
    Cookie master = login("ops@hq.local");
    AppUser target = persistUser(null, "desk@hq.local", AppUserRole.admin_super);
    String body =
        mockMvc
            .perform(
                post("/api/v1/admin/dpdp/requests")
                    .cookie(master)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        "{\"principalType\":\"MASTER\",\"requestType\":\"ACCESS\",\"principalId\":\""
                            + target.getId()
                            + "\"}"))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    UUID id = UUID.fromString(objectMapper.readTree(body).path("data").path("id").asText());
    mockMvc
        .perform(
            post("/api/v1/admin/dpdp/requests/" + id + "/accept")
                .cookie(master)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"identityMethod\":\"HQ badge check\"}"))
        .andExpect(status().isOk());
    mockMvc
        .perform(
            post("/api/v1/admin/dpdp/requests/" + id + "/decide")
                .cookie(master)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"decision\":\"FULFILLED\"}"))
        .andExpect(status().isOk())
        .andExpect(
            jsonPath("$.data.exportJson")
                .value(org.hamcrest.Matchers.containsString("desk@hq.local")))
        .andExpect(
            jsonPath("$.data.exportJson")
                .value(
                    org.hamcrest.Matchers.not(
                        org.hamcrest.Matchers.containsString("passwordHash"))));
  }

  private UUID create(Cookie owner, UUID customerId, String type) throws Exception {
    String body =
        mockMvc
            .perform(
                post("/api/v1/dpdp/requests")
                    .cookie(owner)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        "{\"principalType\":\"CUSTOMER\",\"requestType\":\""
                            + type
                            + "\",\"principalId\":\""
                            + customerId
                            + "\"}"))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return UUID.fromString(objectMapper.readTree(body).path("data").path("id").asText());
  }

  private void accept(Cookie owner, UUID id) throws Exception {
    mockMvc
        .perform(
            post("/api/v1/dpdp/requests/" + id + "/accept")
                .cookie(owner)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"identityMethod\":\"Checked at the counter\"}"))
        .andExpect(status().isOk());
  }

  private Cookie seedOtherOwner() throws Exception {
    Tenant tenant = persistTenant("other", "Other");
    persistPlan(tenant.getId());
    persistUser(tenant.getId(), "owner@other.local", AppUserRole.pharmacy_owner);
    return login("owner@other.local");
  }

  private Fixture seedOwner(String tag) {
    Tenant tenant = persistTenant(tag, "Shop " + tag);
    persistPlan(tenant.getId());
    AppUser owner =
        persistUser(tenant.getId(), "owner@" + tag + ".local", AppUserRole.pharmacy_owner);
    Location branch = persistBranch(tenant.getId());
    return new Fixture(tenant.getId(), branch.getId(), owner.getId());
  }

  private record Fixture(UUID tenantId, UUID branchId, UUID userId) {}

  private Customer persistCustomer(UUID tenantId, String name, String phone) {
    Customer customer = new Customer();
    customer.setId(UUID.randomUUID());
    customer.setTenantId(tenantId);
    customer.setName(name);
    customer.setPhone(phone);
    customer.setCreatedAt(T0);
    customer.setUpdatedAt(T0);
    return customerRepository.save(customer);
  }

  private void persistInvoice(UUID tenantId, UUID branchId, UUID userId, UUID customerId) {
    SalesInvoice invoice = new SalesInvoice();
    invoice.setId(UUID.randomUUID());
    invoice.setTenantId(tenantId);
    invoice.setBranchId(branchId);
    invoice.setInvoiceNumber("INV/2026-27/BR01/00001");
    invoice.setStatus(SalesInvoiceStatus.COMPLETED);
    invoice.setStaffUserId(userId);
    invoice.setTerminalId(UUID.randomUUID());
    invoice.setCustomerId(customerId);
    invoice.setSubtotalPaise(100);
    invoice.setDiscountPaise(0);
    invoice.setTaxPaise(0);
    invoice.setTotalPaise(100);
    invoice.setBillDiscountType(DiscountType.NONE);
    invoice.setBillDiscountValue(0);
    invoice.setTaxJurisdiction(TaxJurisdiction.INTRA);
    invoice.setDiscountApprovalStatus(DiscountApprovalStatus.NOT_REQUIRED);
    invoice.setEinvoiceApplicability(EinvoiceApplicability.NOT_APPLICABLE);
    invoice.setEinvoiceStatus(EinvoiceStatus.NOT_SUBMITTED);
    invoice.setIdempotencyKey("inv-" + invoice.getId());
    invoice.setVersion(1);
    invoice.setCreatedAt(T0);
    invoice.setUpdatedAt(T0);
    invoice.setCompletedAt(T0);
    salesInvoiceRepository.saveAndFlush(invoice);
  }

  private Location persistBranch(UUID tenantId) {
    Location branch = new Location();
    branch.setId(UUID.randomUUID());
    branch.setTenantId(tenantId);
    branch.setName("Main");
    branch.setBranchCode("BR01");
    branch.setAddressLine("12 MG Road");
    branch.setCity("Bengaluru");
    branch.setState("KA");
    branch.setPincode("560001");
    branch.setContactPhone("9876543210");
    branch.setDrugLicenseNumber("DL-BR01");
    Map<String, Object> hours = new LinkedHashMap<>();
    Map<String, Object> mon = new LinkedHashMap<>();
    mon.put("open", "09:00");
    mon.put("close", "21:00");
    hours.put("mon", mon);
    branch.setOperatingHours(hours);
    branch.setBranchType(BranchType.RETAIL);
    branch.setStatus(BranchStatus.ACTIVE);
    branch.setOpeningDate(LocalDate.of(2026, 9, 1));
    branch.setDefaultBranch(true);
    branch.setLinkedWarehouse(false);
    branch.setPricingSettings(Map.of("defaultMarkupBps", 0));
    branch.setTaxSettings(Map.of("gstMode", "CGST_SGST", "taxState", "KA"));
    branch.setCreatedAt(T0);
    branch.setUpdatedAt(T0);
    return locationRepository.saveAndFlush(branch);
  }

  private Cookie login(String email) throws Exception {
    MvcResult result =
        mockMvc
            .perform(
                post("/api/v1/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"email\":\"" + email + "\",\"password\":\"" + PASSWORD + "\"}"))
            .andExpect(status().isOk())
            .andReturn();
    Cookie cookie = result.getResponse().getCookie("nmm_access");
    assertThat(cookie).isNotNull();
    return cookie;
  }

  private Tenant persistTenant(String slug, String name) {
    Tenant tenant = new Tenant();
    tenant.setId(UUID.randomUUID());
    tenant.setSlug(slug);
    tenant.setName(name);
    tenant.setStatus(TenantStatus.ACTIVE);
    tenant.setEmailVerifiedAt(T0);
    tenant.setCreatedAt(T0);
    tenant.setUpdatedAt(T0);
    return tenantRepository.save(tenant);
  }

  private void persistPlan(UUID tenantId) {
    TenantSubscription sub = new TenantSubscription();
    sub.setId(UUID.randomUUID());
    sub.setTenantId(tenantId);
    sub.setPlanCode(PlanCode.FREE);
    sub.setStatus(SubscriptionStatus.ACTIVE);
    sub.setStartedAt(T0);
    sub.setCreatedAt(T0);
    sub.setUpdatedAt(T0);
    tenantSubscriptionRepository.save(sub);
  }

  private AppUser persistUser(UUID tenantId, String email, AppUserRole role) {
    AppUser user = new AppUser();
    user.setId(UUID.randomUUID());
    user.setTenantId(tenantId);
    user.setEmail(email);
    user.setPasswordHash(passwordEncoder.encode(PASSWORD));
    user.setDisplayName(email);
    user.setRole(role);
    user.setStatus(UserAccountStatus.ACTIVE);
    user.setActive(true);
    user.setMustChangePassword(false);
    user.setCreatedAt(T0);
    user.setUpdatedAt(T0);
    user.setPasswordChangedAt(T0);
    return appUserRepository.save(user);
  }
}
