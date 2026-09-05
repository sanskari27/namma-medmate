package com.nammamedmate.server.feature.prescription;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nammamedmate.server.AbstractIntegrationTest;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.AuditEvent;
import com.nammamedmate.server.domain.BranchStatus;
import com.nammamedmate.server.domain.BranchType;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.PrescriptionReference;
import com.nammamedmate.server.domain.PrescriptionReferencePolicy;
import com.nammamedmate.server.domain.PrescriptionReferenceStatus;
import com.nammamedmate.server.domain.SalesInvoiceStatus;
import com.nammamedmate.server.domain.SubscriptionStatus;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TenantStatus;
import com.nammamedmate.server.domain.TenantSubscription;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.AuditEventRepository;
import com.nammamedmate.server.persistence.ControlledSaleRegisterRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.PrescriptionReferenceRepository;
import com.nammamedmate.server.persistence.SalesInvoiceRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.persistence.TenantSubscriptionRepository;
import jakarta.servlet.http.Cookie;
import java.time.Instant;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

class PrescriptionReferenceTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-05T07:00:00Z");

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private TenantSubscriptionRepository tenantSubscriptionRepository;
  @Autowired private LocationRepository locationRepository;
  @Autowired private PrescriptionReferenceRepository referenceRepository;
  @Autowired private SalesInvoiceRepository salesInvoiceRepository;
  @Autowired private ControlledSaleRegisterRepository controlledSaleRegisterRepository;
  @Autowired private AuditEventRepository auditEventRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @Test
  void ac01_onlySaleTimeReferencesAreCovered() throws Exception {
    Fixture fx = seed("rxa-ac01");
    mockMvc
        .perform(
            post("/api/v1/prescription-references")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"prescriptionReference\":\"RX-STANDALONE\",\"customerId\":\""
                        + UUID.randomUUID()
                        + "\"}"))
        .andExpect(status().isMethodNotAllowed());
    mockMvc
        .perform(get("/api/v1/prescription-references").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items").isEmpty());
    Stocked product = stocked(fx, "RX-A1", "Amoxil", true, false);
    UUID customerId = createCustomer(fx.cookie(), "Ravi", "9421100001");
    completeRx(fx, customerId, null, "RX-SALE", product, "30", "90", "a1");
    mockMvc
        .perform(get("/api/v1/prescription-references").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items.length()").value(1))
        .andExpect(jsonPath("$.data.items[0].prescriptionReference").value("RX-SALE"))
        .andExpect(jsonPath("$.data.items[0].status").value("ACTIVE"))
        .andExpect(jsonPath("$.data.items[0].customerName").value("Ravi"));
    assertThat(referenceRepository.findByTenantIdOrderByIssuedAtDesc(fx.tenantId())).hasSize(1);
  }

  @Test
  void ac02_archiveNeverDeletesInvoiceOrControlledRegister() throws Exception {
    Fixture fx = seed("rxa-ac02");
    Stocked controlled = stocked(fx, "H1-A2", "Alprazolam", true, true);
    UUID customerId = createCustomer(fx.cookie(), "Meera", "9421100002");
    UUID doctorId = createDoctor(fx.cookie(), "Dr Rao", "KA-410");
    UUID invoiceId = completeRx(fx, customerId, doctorId, "RX-H1-A", controlled, "1", "1", "a2");
    long invoices = salesInvoiceRepository.count();
    long ndps = controlledSaleRegisterRepository.count();
    assertThat(ndps).isGreaterThan(0);
    mockMvc
        .perform(get("/api/v1/prescription-references?status=ARCHIVED").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items.length()").value(1))
        .andExpect(jsonPath("$.data.items[0].archiveReason").value("FULFILLED"));
    mockMvc
        .perform(get("/api/v1/sales/invoices/" + invoiceId).cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("COMPLETED"))
        .andExpect(jsonPath("$.data.prescriptionReference").value("RX-H1-A"));
    mockMvc
        .perform(get("/api/v1/compliance/controlled-register").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items.length()").value((int) ndps));
    assertThat(salesInvoiceRepository.count()).isEqualTo(invoices);
    assertThat(controlledSaleRegisterRepository.count()).isEqualTo(ndps);
    assertThat(salesInvoiceRepository.findById(invoiceId).orElseThrow().getStatus())
        .isEqualTo(SalesInvoiceStatus.COMPLETED);
  }

  @Test
  void ac03_validityIsSixMonthsThenScanArchivesExpired() throws Exception {
    Fixture fx = seed("rxa-ac03");
    Stocked product = stocked(fx, "RX-A3", "Thyronorm", true, false);
    UUID customerId = createCustomer(fx.cookie(), "Anu", "9421100003");
    completeRx(fx, customerId, null, "RX-90-A", product, "30", "90", "a3");
    PrescriptionReference row =
        referenceRepository
            .findByTenantIdAndPrescriptionReference(fx.tenantId(), "RX-90-A")
            .orElseThrow();
    assertThat(row.getStatus()).isEqualTo(PrescriptionReferenceStatus.ACTIVE);
    assertThat(row.getExpiresAt())
        .isEqualTo(PrescriptionReferencePolicy.expiresAt(row.getIssuedAt()));
    mockMvc
        .perform(
            post("/api/v1/prescription-references/" + row.getId() + "/archive").cookie(fx.cookie()))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("PREMATURE_ARCHIVE"));
    Instant issued = Instant.parse("2025-01-01T07:00:00Z");
    row.setIssuedAt(issued);
    row.setExpiresAt(PrescriptionReferencePolicy.expiresAt(issued));
    referenceRepository.saveAndFlush(row);
    mockMvc
        .perform(post("/api/v1/prescription-references/scan").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.archived").value(1));
    mockMvc
        .perform(get("/api/v1/prescription-references/" + row.getId()).cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("ARCHIVED"))
        .andExpect(jsonPath("$.data.archiveReason").value("EXPIRED"))
        .andExpect(jsonPath("$.data.invoices.length()").value(1));
  }

  @Test
  void ac04_listDistinguishesActiveAndArchived() throws Exception {
    Fixture fx = seed("rxa-ac04");
    Stocked product = stocked(fx, "RX-A4", "Cefixime", true, false);
    UUID customerId = createCustomer(fx.cookie(), "Kiran", "9421100004");
    completeRx(fx, customerId, null, "RX-OPEN", product, "10", "90", "a4-open");
    completeRx(fx, customerId, null, "RX-DONE", product, "90", "90", "a4-done");
    mockMvc
        .perform(get("/api/v1/prescription-references?status=ACTIVE").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items.length()").value(1))
        .andExpect(jsonPath("$.data.items[0].prescriptionReference").value("RX-OPEN"))
        .andExpect(jsonPath("$.data.items[0].status").value("ACTIVE"));
    mockMvc
        .perform(get("/api/v1/prescription-references?status=ARCHIVED").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items.length()").value(1))
        .andExpect(jsonPath("$.data.items[0].prescriptionReference").value("RX-DONE"))
        .andExpect(jsonPath("$.data.items[0].status").value("ARCHIVED"))
        .andExpect(jsonPath("$.data.items[0].archiveReason").value("FULFILLED"));
    UUID archivedId =
        referenceRepository
            .findByTenantIdAndPrescriptionReference(fx.tenantId(), "RX-DONE")
            .orElseThrow()
            .getId();
    mockMvc
        .perform(get("/api/v1/prescription-references/" + archivedId).cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.invoices[0].invoiceNumber").isNotEmpty());
  }

  @Test
  void ac05_authIsolationPrematureStaleAndNoReactivation() throws Exception {
    Fixture fx = seed("rxa-ac05");
    Stocked product = stocked(fx, "RX-A5", "Cefixime Iso", true, false);
    UUID customerId = createCustomer(fx.cookie(), "Asha", "9421100005");
    completeRx(fx, customerId, null, "RX-ISO", product, "10", "90", "a5");
    PrescriptionReference row =
        referenceRepository
            .findByTenantIdAndPrescriptionReference(fx.tenantId(), "RX-ISO")
            .orElseThrow();
    Cookie cashier = staffWithPredefined(fx, "cashier", "till@rxa-ac05.local");
    Cookie pharmacist = staffWithPredefined(fx, "pharmacist", "rx@rxa-ac05.local");
    mockMvc.perform(get("/api/v1/prescription-references")).andExpect(status().isUnauthorized());
    mockMvc
        .perform(get("/api/v1/prescription-references").cookie(cashier))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"))
        .andExpect(jsonPath("$.data").doesNotExist());
    mockMvc
        .perform(get("/api/v1/prescription-references").cookie(pharmacist))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items[0].prescriptionReference").value("RX-ISO"));
    mockMvc
        .perform(
            post("/api/v1/prescription-references/" + row.getId() + "/archive")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"expectedVersion\":" + (row.getVersion() - 1) + "}"))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("STALE_STATE"));
    assertThat(
            referenceRepository
                .findByIdAndTenantId(row.getId(), fx.tenantId())
                .orElseThrow()
                .getStatus())
        .isEqualTo(PrescriptionReferenceStatus.ACTIVE);
    Fixture other = seed("rxa-ac05b");
    mockMvc
        .perform(get("/api/v1/prescription-references/" + row.getId()).cookie(other.cookie()))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.data").doesNotExist());
    UUID fullId = completeRx(fx, customerId, null, "RX-DONE-BLOCK", product, "90", "90", "a5-full");
    mockMvc
        .perform(
            get("/api/v1/sales/prescriptions")
                .cookie(fx.cookie())
                .param("reference", "RX-DONE-BLOCK")
                .param("customerId", customerId.toString()))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("ARCHIVED_REFERENCE"));
    mockMvc
        .perform(
            post("/api/v1/sales/invoices")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    draftJson(
                        customerId, null, "RX-DONE-BLOCK", true, product, "1", "90", "a5-again")))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("ARCHIVED_REFERENCE"));
    mockMvc
        .perform(get("/api/v1/sales/invoices/" + fullId).cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("COMPLETED"));
    UUID archivedId =
        referenceRepository
            .findByTenantIdAndPrescriptionReference(fx.tenantId(), "RX-DONE-BLOCK")
            .orElseThrow()
            .getId();
    mockMvc
        .perform(
            post("/api/v1/prescription-references/" + archivedId + "/unarchive")
                .cookie(fx.cookie()))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("REACTIVATION_FORBIDDEN"));
    mockMvc
        .perform(
            post("/api/v1/prescription-references/" + archivedId + "/archive").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("ARCHIVED"));
    assertThat(
            auditEventRepository
                .findByTenantIdAndCreatedAtGreaterThanEqualOrderByCreatedAtDesc(
                    fx.tenantId(), Instant.EPOCH)
                .stream()
                .map(AuditEvent::getAction)
                .toList())
        .contains("PRESCRIPTION_REFERENCE_ARCHIVE");
    mockMvc
        .perform(get("/api/v1/prescription-references?status=NOPE").cookie(fx.cookie()))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
  }

  private UUID completeRx(
      Fixture fx,
      UUID customerId,
      UUID doctorId,
      String reference,
      Stocked product,
      String quantity,
      String prescribed,
      String key)
      throws Exception {
    UUID invoiceId =
        idOf(
            mockMvc
                .perform(
                    post("/api/v1/sales/invoices")
                        .cookie(fx.cookie())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                            draftJson(
                                customerId,
                                doctorId,
                                reference,
                                true,
                                product,
                                quantity,
                                prescribed,
                                key)))
                .andExpect(status().isOk())
                .andReturn());
    int version =
        objectMapper
            .readTree(
                mockMvc
                    .perform(get("/api/v1/sales/invoices/" + invoiceId).cookie(fx.cookie()))
                    .andExpect(status().isOk())
                    .andReturn()
                    .getResponse()
                    .getContentAsString())
            .path("data")
            .path("version")
            .asInt();
    long total =
        objectMapper
            .readTree(
                mockMvc
                    .perform(get("/api/v1/sales/invoices/" + invoiceId).cookie(fx.cookie()))
                    .andReturn()
                    .getResponse()
                    .getContentAsString())
            .path("data")
            .path("totalPaise")
            .asLong();
    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + invoiceId + "/complete")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(completeJson(version, total, key + "-pay")))
        .andExpect(status().isOk());
    return invoiceId;
  }

  private UUID idOf(MvcResult result) throws Exception {
    return UUID.fromString(
        objectMapper
            .readTree(result.getResponse().getContentAsString())
            .path("data")
            .path("id")
            .asText());
  }

  private Cookie staffWithPredefined(Fixture fx, String roleCode, String email) throws Exception {
    AppUser staff = persistUser(fx.tenantId(), email, AppUserRole.pharmacy_staff);
    UUID roleId = predefinedId(fx.cookie(), roleCode);
    mockMvc
        .perform(
            put("/api/v1/users/" + staff.getId() + "/roles")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"roleIds\":[\"" + roleId + "\"]}"))
        .andExpect(status().isOk());
    mockMvc
        .perform(
            put("/api/v1/users/" + staff.getId() + "/branches")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"branchIds\":[\"" + fx.branchId() + "\"]}"))
        .andExpect(status().isOk());
    Cookie cookie = login(email);
    mockMvc
        .perform(
            post("/api/v1/session/branch")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"branchId\":\"" + fx.branchId() + "\"}"))
        .andExpect(status().isOk());
    return cookie;
  }

  private UUID predefinedId(Cookie cookie, String code) throws Exception {
    String body =
        mockMvc
            .perform(get("/api/v1/roles").cookie(cookie))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    for (JsonNode role : objectMapper.readTree(body).path("data").path("roles")) {
      if (code.equals(role.path("code").asText())) {
        return UUID.fromString(role.path("id").asText());
      }
    }
    throw new AssertionError("missing predefined role " + code);
  }

  private Stocked stocked(
      Fixture fx, String sku, String name, boolean prescriptionRequired, boolean controlled)
      throws Exception {
    UUID categoryId =
        UUID.fromString(
            objectMapper
                .readTree(
                    mockMvc
                        .perform(
                            post("/api/v1/product-categories")
                                .cookie(fx.cookie())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"name\":\"" + sku + " cat\"}"))
                        .andExpect(status().isOk())
                        .andReturn()
                        .getResponse()
                        .getContentAsString())
                .path("data")
                .path("id")
                .asText());
    UUID productId =
        UUID.fromString(
            objectMapper
                .readTree(
                    mockMvc
                        .perform(
                            post("/api/v1/products")
                                .cookie(fx.cookie())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                    productJson(
                                        sku, name, categoryId, prescriptionRequired, controlled)))
                        .andExpect(status().isOk())
                        .andReturn()
                        .getResponse()
                        .getContentAsString())
                .path("data")
                .path("id")
                .asText());
    mockMvc
        .perform(
            post("/api/v1/inventory/receipts")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"productId\":\"%s\",\"batchNumber\":\"LOT-RX\",\"manufacturedOn\":\"2026-01-15\",\"expiresOn\":\"2027-06-30\",\"purchasePricePaise\":12500,\"quantity\":\"200\",\"idempotencyKey\":\"%s-recv\",\"expectedVersion\":0}"
                        .formatted(productId, sku)))
        .andExpect(status().isOk());
    String body =
        mockMvc
            .perform(
                get("/api/v1/inventory/products/" + productId + "/batches").cookie(fx.cookie()))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    UUID batchId =
        UUID.fromString(
            objectMapper.readTree(body).path("data").path("items").get(0).path("batchId").asText());
    return new Stocked(productId, batchId);
  }

  private UUID createCustomer(Cookie cookie, String name, String phone) throws Exception {
    String body =
        mockMvc
            .perform(
                post("/api/v1/customers")
                    .cookie(cookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"name\":\"%s\",\"phone\":\"%s\"}".formatted(name, phone)))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return UUID.fromString(objectMapper.readTree(body).path("data").path("id").asText());
  }

  private UUID createDoctor(Cookie cookie, String name, String registration) throws Exception {
    String body =
        mockMvc
            .perform(
                post("/api/v1/doctors")
                    .cookie(cookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        "{\"name\":\"%s\",\"registrationNumber\":\"%s\"}"
                            .formatted(name, registration)))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return UUID.fromString(objectMapper.readTree(body).path("data").path("id").asText());
  }

  private Fixture seed(String tag) throws Exception {
    Tenant tenant = persistTenant(tag, "RxA " + tag);
    persistPlan(tenant.getId());
    persistUser(tenant.getId(), "owner@" + tag + ".local", AppUserRole.pharmacy_owner);
    Location branch = persistBranch(tenant.getId());
    Cookie cookie = login("owner@" + tag + ".local");
    mockMvc
        .perform(
            post("/api/v1/session/branch")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"branchId\":\"" + branch.getId() + "\"}"))
        .andExpect(status().isOk());
    return new Fixture(tenant.getId(), branch.getId(), cookie);
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
    branch.setGstin("29ABCDE1234F1Z5");
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

  private Cookie login(String email) throws Exception {
    MvcResult result =
        mockMvc
            .perform(
                post("/api/v1/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"email\":\"" + email + "\",\"password\":\"" + PASSWORD + "\"}"))
            .andExpect(status().isOk())
            .andReturn();
    Cookie access = result.getResponse().getCookie("nmm_access");
    assertThat(access).isNotNull();
    return access;
  }

  private static String draftJson(
      UUID customerId,
      UUID doctorId,
      String reference,
      boolean verified,
      Stocked product,
      String quantity,
      String prescribed,
      String key) {
    String customer = customerId == null ? "null" : "\"" + customerId + "\"";
    String doctor = doctorId == null ? "null" : "\"" + doctorId + "\"";
    String rx = reference == null ? "null" : "\"" + reference + "\"";
    return """
        {
          "customerId":%s,
          "doctorId":%s,
          "prescriptionReference":%s,
          "prescriptionVerified":%s,
          "idempotencyKey":"%s",
          "lines":[{
            "productId":"%s",
            "batchId":"%s",
            "quantity":%s,
            "unit":"Tablet",
            "mrpPaise":12000,
            "sellingPricePaise":10000,
            "discountPaise":0,
            "prescribedQuantity":%s
          }]
        }
        """
        .formatted(
            customer,
            doctor,
            rx,
            verified,
            key,
            product.productId(),
            product.batchId(),
            quantity,
            prescribed);
  }

  private static String completeJson(int version, long expectedTotal, String key) {
    return """
        {
          "expectedVersion":%d,
          "expectedTotalPaise":%d,
          "changePaise":0,
          "idempotencyKey":"%s",
          "payments":[{"mode":"CASH","amountPaise":%d}]
        }
        """
        .formatted(version, expectedTotal, key, expectedTotal);
  }

  private static String productJson(
      String sku, String name, UUID categoryId, boolean prescriptionRequired, boolean controlled) {
    String schedule = controlled ? "\"H1\"" : "null";
    return """
        {
          "sku":"%s",
          "barcode":null,
          "name":"%s",
          "genericName":null,
          "brandName":null,
          "manufacturerId":null,
          "categoryId":"%s",
          "productType":"Medicine",
          "dosageForm":"Tablet",
          "therapeuticClass":null,
          "composition":null,
          "strength":null,
          "route":null,
          "prescriptionRequired":%s,
          "scheduleClassification":%s,
          "hsnCode":"30049099",
          "gstRate":12,
          "baseUnit":"Tablet",
          "packSize":10,
          "packUnit":"strip",
          "packDescription":null,
          "storageConditions":null,
          "requiresColdStorage":false,
          "rackLocation":null,
          "reorderLevel":null,
          "reorderQuantity":null,
          "minimumStock":null,
          "isDiscontinued":false,
          "isReturnable":true,
          "isTaxable":true,
          "taxCategory":"GST-12",
          "requiresBatchTracking":true,
          "requiresExpiryTracking":true,
          "requiresSerialTracking":false,
          "controlledSubstance":%s,
          "notes":null,
          "isActive":true
        }
        """
        .formatted(sku, name, categoryId, prescriptionRequired, schedule, controlled);
  }

  private record Fixture(UUID tenantId, UUID branchId, Cookie cookie) {}

  private record Stocked(UUID productId, UUID batchId) {}
}
