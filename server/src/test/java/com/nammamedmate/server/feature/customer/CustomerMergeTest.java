package com.nammamedmate.server.feature.customer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nammamedmate.server.AbstractIntegrationTest;
import com.nammamedmate.server.domain.AccessRoleKind;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.BranchStatus;
import com.nammamedmate.server.domain.BranchType;
import com.nammamedmate.server.domain.Customer;
import com.nammamedmate.server.domain.CustomerCreditAccount;
import com.nammamedmate.server.domain.CustomerCreditLedgerEntry;
import com.nammamedmate.server.domain.CustomerCreditLedgerType;
import com.nammamedmate.server.domain.CustomerHistoryFact;
import com.nammamedmate.server.domain.CustomerHistoryFactType;
import com.nammamedmate.server.domain.CustomerLoyaltyAccount;
import com.nammamedmate.server.domain.CustomerLoyaltyLedgerEntry;
import com.nammamedmate.server.domain.CustomerRefillSchedule;
import com.nammamedmate.server.domain.CustomerTag;
import com.nammamedmate.server.domain.CustomerTagAssignment;
import com.nammamedmate.server.domain.DiscountApprovalStatus;
import com.nammamedmate.server.domain.DiscountType;
import com.nammamedmate.server.domain.EinvoiceApplicability;
import com.nammamedmate.server.domain.EinvoiceStatus;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.LoyaltyLedgerType;
import com.nammamedmate.server.domain.NotificationEvent;
import com.nammamedmate.server.domain.NotificationTrigger;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.SalesInvoice;
import com.nammamedmate.server.domain.SalesInvoiceStatus;
import com.nammamedmate.server.domain.SubscriptionStatus;
import com.nammamedmate.server.domain.TaxJurisdiction;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TenantStatus;
import com.nammamedmate.server.domain.TenantSubscription;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.persistence.AccessRoleEventRepository;
import com.nammamedmate.server.persistence.AccessRoleModuleRepository;
import com.nammamedmate.server.persistence.AccessRoleRepository;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.CustomerCreditAccountRepository;
import com.nammamedmate.server.persistence.CustomerCreditLedgerEntryRepository;
import com.nammamedmate.server.persistence.CustomerHistoryFactRepository;
import com.nammamedmate.server.persistence.CustomerLoyaltyAccountRepository;
import com.nammamedmate.server.persistence.CustomerLoyaltyLedgerEntryRepository;
import com.nammamedmate.server.persistence.CustomerRefillScheduleRepository;
import com.nammamedmate.server.persistence.CustomerRepository;
import com.nammamedmate.server.persistence.CustomerTagAssignmentRepository;
import com.nammamedmate.server.persistence.CustomerTagRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.NotificationEventRepository;
import com.nammamedmate.server.persistence.SalesInvoiceRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.persistence.TenantSubscriptionRepository;
import com.nammamedmate.server.persistence.UserAccessRoleRepository;
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

class CustomerMergeTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-04T03:00:00Z");

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private UserSessionRepository userSessionRepository;
  @Autowired private TenantSubscriptionRepository tenantSubscriptionRepository;
  @Autowired private CustomerRepository customerRepository;
  @Autowired private NotificationEventRepository notificationEventRepository;
  @Autowired private LocationRepository locationRepository;
  @Autowired private SalesInvoiceRepository salesInvoiceRepository;
  @Autowired private CustomerCreditAccountRepository creditAccountRepository;
  @Autowired private CustomerCreditLedgerEntryRepository creditLedgerRepository;
  @Autowired private CustomerLoyaltyAccountRepository loyaltyAccountRepository;
  @Autowired private CustomerLoyaltyLedgerEntryRepository loyaltyLedgerRepository;
  @Autowired private CustomerHistoryFactRepository historyFactRepository;
  @Autowired private CustomerRefillScheduleRepository refillScheduleRepository;
  @Autowired private CustomerTagRepository customerTagRepository;
  @Autowired private CustomerTagAssignmentRepository customerTagAssignmentRepository;
  @Autowired private UserAccessRoleRepository userAccessRoleRepository;
  @Autowired private AccessRoleEventRepository accessRoleEventRepository;
  @Autowired private AccessRoleModuleRepository accessRoleModuleRepository;
  @Autowired private AccessRoleRepository accessRoleRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @BeforeEach
  void wipe() {
    creditLedgerRepository.deleteAll();
    loyaltyLedgerRepository.deleteAll();
    historyFactRepository.deleteAll();
    refillScheduleRepository.deleteAll();
    customerTagAssignmentRepository.deleteAll();
    customerTagRepository.deleteAll();
    creditAccountRepository.deleteAll();
    loyaltyAccountRepository.deleteAll();
    salesInvoiceRepository.deleteAll();
    locationRepository.deleteAll();
    notificationEventRepository.deleteAll();
    customerRepository.deleteAll();
    accessRoleEventRepository.deleteAll();
    userAccessRoleRepository.deleteAll();
    accessRoleRepository
        .findByKind(AccessRoleKind.CUSTOM)
        .forEach(
            role -> {
              accessRoleModuleRepository.deleteAll(
                  accessRoleModuleRepository.findByRoleIdIn(java.util.List.of(role.getId())));
              accessRoleRepository.delete(role);
            });
    userSessionRepository.deleteAll();
    tenantSubscriptionRepository.deleteAll();
    appUserRepository.deleteAll();
    tenantRepository.deleteAll();
  }

  @Test
  void ac01_survivorAndDuplicateMustBelongToSameTenant() throws Exception {
    Tenant tenantA = persistTenant("merge-a", "Merge A");
    Tenant tenantB = persistTenant("merge-b", "Merge B");
    persistPlan(tenantA.getId(), PlanCode.FREE);
    persistPlan(tenantB.getId(), PlanCode.FREE);
    persistUser(tenantA.getId(), "owner-a@merge.local", AppUserRole.pharmacy_owner);
    persistUser(tenantB.getId(), "owner-b@merge.local", AppUserRole.pharmacy_owner);
    Cookie ownerA = login("owner-a@merge.local");
    Cookie ownerB = login("owner-b@merge.local");

    UUID survivor = createCustomer(ownerA, "Anita", "9001000001");
    UUID foreign = createCustomer(ownerB, "Anita B", "9001000002");

    mockMvc
        .perform(
            post("/api/v1/customers/merge")
                .cookie(ownerA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mergeJson("PREVIEW", survivor, foreign, "{}")))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));

    mockMvc
        .perform(
            post("/api/v1/customers/merge")
                .cookie(ownerA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mergeJson("EXECUTE", survivor, foreign, "{}")))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));

    assertThat(customerRepository.findById(foreign)).isPresent();
    assertThat(customerRepository.findById(foreign).orElseThrow().getDeletedAt()).isNull();
  }

  @Test
  void ac02_referencesMoveTransactionallyWithoutRewritingImmutableFacts() throws Exception {
    Tenant tenant = persistTenant("merge-refs", "Merge Refs");
    persistPlan(tenant.getId(), PlanCode.FREE);
    AppUser owner =
        persistUser(tenant.getId(), "owner@merge-refs.local", AppUserRole.pharmacy_owner);
    Cookie cookie = login("owner@merge-refs.local");

    UUID survivor = createCustomer(cookie, "Ravi", "9002000001");
    UUID duplicate =
        createCustomerFull(
            cookie, "Ravi Kumar", "9002000002", "ravi.dup@example.com", "O+", "Dust", "Asthma");

    Instant survivorCreated = customerRepository.findById(survivor).orElseThrow().getCreatedAt();

    NotificationEvent event = new NotificationEvent();
    event.setId(UUID.randomUUID());
    event.setEventKey("credit-due-" + duplicate);
    event.setTrigger(NotificationTrigger.CREDIT_DUE);
    event.setTenantId(tenant.getId());
    event.setSourceRecordId(UUID.randomUUID());
    event.setCustomerId(duplicate);
    event.setCreatedAt(T0);
    notificationEventRepository.save(event);

    mockMvc
        .perform(
            post("/api/v1/customers/merge")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    mergeJson(
                        "EXECUTE",
                        survivor,
                        duplicate,
                        """
                        {
                          "name":"DUPLICATE",
                          "phone":"SURVIVOR",
                          "email":"DUPLICATE",
                          "bloodGroup":"DUPLICATE",
                          "allergies":"DUPLICATE",
                          "chronicConditions":"DUPLICATE"
                        }
                        """)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.id").value(survivor.toString()))
        .andExpect(jsonPath("$.data.name").value("Ravi Kumar"))
        .andExpect(jsonPath("$.data.phone").value("9002000001"))
        .andExpect(jsonPath("$.data.email").value("ravi.dup@example.com"))
        .andExpect(jsonPath("$.data.bloodGroup").value("O+"))
        .andExpect(jsonPath("$.data.allergies").value("Dust"))
        .andExpect(jsonPath("$.data.chronicConditions").value("Asthma"));

    Customer survivorRow = customerRepository.findById(survivor).orElseThrow();
    assertThat(survivorRow.getCreatedAt()).isEqualTo(survivorCreated);
    assertThat(survivorRow.getDeletedAt()).isNull();

    Customer duplicateRow = customerRepository.findById(duplicate).orElseThrow();
    assertThat(duplicateRow.getDeletedAt()).isNotNull();
    assertThat(duplicateRow.getMergedIntoId()).isEqualTo(survivor);
    assertThat(duplicateRow.getMergedByUserId()).isEqualTo(owner.getId());
    assertThat(duplicateRow.getMergedAt()).isNotNull();

    NotificationEvent moved = notificationEventRepository.findById(event.getId()).orElseThrow();
    assertThat(moved.getCustomerId()).isEqualTo(survivor);
    assertThat(moved.getEventKey()).isEqualTo("credit-due-" + duplicate);
    assertThat(moved.getCreatedAt()).isEqualTo(T0);

    mockMvc
        .perform(get("/api/v1/customers").cookie(cookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(1)))
        .andExpect(jsonPath("$.data.items[0].id").value(survivor.toString()));
  }

  @Test
  void ac02_mergeMovesSalesKhataLoyaltyHistory_M3_CRM_002() throws Exception {
    Tenant tenant = persistTenant("merge-move", "Merge Move");
    persistPlan(tenant.getId(), PlanCode.GROWTH);
    AppUser owner =
        persistUser(tenant.getId(), "owner@merge-move.local", AppUserRole.pharmacy_owner);
    Cookie cookie = login("owner@merge-move.local");
    Location branch = persistBranch(tenant.getId(), "Main", "BR01");

    UUID survivor = createCustomer(cookie, "Ravi", "9002100001");
    UUID duplicate = createCustomer(cookie, "Ravi Dup", "9002100002");

    SalesInvoice invoice = persistInvoice(tenant.getId(), branch.getId(), owner.getId(), duplicate);
    long totalPaise = invoice.getTotalPaise();
    persistCredit(tenant.getId(), duplicate, owner.getId(), invoice.getId(), 5_000L);
    persistLoyalty(tenant.getId(), duplicate, owner.getId(), 40);
    persistHistory(tenant.getId(), duplicate, invoice.getId());
    persistRefill(tenant.getId(), duplicate, "Amlodipine");
    persistTag(tenant.getId(), duplicate, "Regular");

    mockMvc
        .perform(
            post("/api/v1/customers/merge")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mergeJson("PREVIEW", survivor, duplicate, "{}")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.linkedRecords.notificationEvents").value(0))
        .andExpect(jsonPath("$.data.linkedRecords.salesInvoices").value(1))
        .andExpect(jsonPath("$.data.linkedRecords.creditEntries").value(1))
        .andExpect(jsonPath("$.data.linkedRecords.loyaltyEntries").value(1))
        .andExpect(jsonPath("$.data.linkedRecords.historyFacts").value(1))
        .andExpect(jsonPath("$.data.linkedRecords.refills").value(1))
        .andExpect(jsonPath("$.data.linkedRecords.tags").value(1));

    mockMvc
        .perform(
            post("/api/v1/customers/merge")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    mergeJson(
                        "EXECUTE",
                        survivor,
                        duplicate,
                        "{\"name\":\"SURVIVOR\",\"phone\":\"SURVIVOR\"}")))
        .andExpect(status().isOk());

    SalesInvoice movedInvoice = salesInvoiceRepository.findById(invoice.getId()).orElseThrow();
    assertThat(movedInvoice.getCustomerId()).isEqualTo(survivor);
    assertThat(movedInvoice.getTotalPaise()).isEqualTo(totalPaise);
    assertThat(
            creditAccountRepository
                .findByTenantIdAndCustomerId(tenant.getId(), survivor)
                .orElseThrow()
                .getBalancePaise())
        .isEqualTo(5_000L);
    assertThat(
            creditLedgerRepository.findAllByTenantIdAndCustomerIdOrderByOccurredAtDesc(
                tenant.getId(), survivor))
        .hasSize(1);
    assertThat(
            loyaltyAccountRepository
                .findByTenantIdAndCustomerId(tenant.getId(), survivor)
                .orElseThrow()
                .getBalancePoints())
        .isEqualTo(40L);
    assertThat(
            historyFactRepository.findAllByTenantIdAndCustomerIdOrderByOccurredAtDesc(
                tenant.getId(), survivor))
        .hasSize(1);
    assertThat(
            refillScheduleRepository
                .findAllByTenantIdAndCustomerIdOrderByNextDueOnAscMedicineNameAsc(
                    tenant.getId(), survivor))
        .hasSize(1);
    assertThat(
            customerTagAssignmentRepository.findAllByTenantIdAndCustomerId(
                tenant.getId(), survivor))
        .hasSize(1);
  }

  @Test
  void ac03_conflictsArePreviewedBeforeConfirmation() throws Exception {
    Tenant tenant = persistTenant("merge-prev", "Merge Preview");
    persistPlan(tenant.getId(), PlanCode.FREE);
    persistUser(tenant.getId(), "owner@merge-prev.local", AppUserRole.pharmacy_owner);
    Cookie cookie = login("owner@merge-prev.local");

    UUID survivor =
        createCustomerFull(
            cookie, "Meera", "9003000001", "meera@a.local", "A+", "Penicillin", null);
    UUID duplicate =
        createCustomerFull(
            cookie, "Meera S", "9003000002", "meera@b.local", "B+", "Sulfa", "Hypertension");

    NotificationEvent event = new NotificationEvent();
    event.setId(UUID.randomUUID());
    event.setEventKey("credit-due-preview-" + duplicate);
    event.setTrigger(NotificationTrigger.CREDIT_DUE);
    event.setTenantId(tenant.getId());
    event.setSourceRecordId(UUID.randomUUID());
    event.setCustomerId(duplicate);
    event.setCreatedAt(T0);
    notificationEventRepository.save(event);

    MvcResult preview =
        mockMvc
            .perform(
                post("/api/v1/customers/merge")
                    .cookie(cookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(mergeJson("PREVIEW", survivor, duplicate, "{}")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.mode").value("PREVIEW"))
            .andExpect(jsonPath("$.data.survivor.id").value(survivor.toString()))
            .andExpect(jsonPath("$.data.duplicate.id").value(duplicate.toString()))
            .andExpect(jsonPath("$.data.conflicts", hasItem("name")))
            .andExpect(jsonPath("$.data.conflicts", hasItem("phone")))
            .andExpect(jsonPath("$.data.conflicts", hasItem("email")))
            .andExpect(jsonPath("$.data.conflicts", hasItem("bloodGroup")))
            .andExpect(jsonPath("$.data.conflicts", hasItem("allergies")))
            .andExpect(jsonPath("$.data.linkedRecords.notificationEvents").value(1))
            .andReturn();

    JsonNode fields =
        objectMapper
            .readTree(preview.getResponse().getContentAsString())
            .path("data")
            .path("fields");
    assertThat(fields.isArray()).isTrue();
    assertThat(fields).isNotEmpty();

    mockMvc
        .perform(
            post("/api/v1/customers/merge")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mergeJson("EXECUTE", survivor, duplicate, "{}")))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("MERGE_CONFLICTS"));

    assertThat(customerRepository.findById(duplicate).orElseThrow().getDeletedAt()).isNull();
  }

  @Test
  void ac04_duplicateIsSoftDeactivatedWithMergeProvenance() throws Exception {
    Tenant tenant = persistTenant("merge-soft", "Merge Soft");
    persistPlan(tenant.getId(), PlanCode.FREE);
    AppUser owner =
        persistUser(tenant.getId(), "owner@merge-soft.local", AppUserRole.pharmacy_owner);
    Cookie cookie = login("owner@merge-soft.local");

    UUID survivor = createCustomer(cookie, "Same Name", "9004000001");
    UUID duplicate = createCustomer(cookie, "Same Name", "9004000002");

    mockMvc
        .perform(
            post("/api/v1/customers/merge")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mergeJson("EXECUTE", survivor, duplicate, "{\"phone\":\"SURVIVOR\"}")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.id").value(survivor.toString()));

    Customer duplicateRow = customerRepository.findById(duplicate).orElseThrow();
    assertThat(duplicateRow.getDeletedAt()).isNotNull();
    assertThat(duplicateRow.getMergedIntoId()).isEqualTo(survivor);
    assertThat(duplicateRow.getMergedAt()).isNotNull();
    assertThat(duplicateRow.getMergedByUserId()).isEqualTo(owner.getId());

    mockMvc
        .perform(get("/api/v1/customers/" + duplicate).cookie(cookie))
        .andExpect(status().isNotFound());
  }

  @Test
  void ac05_deniedStalePhoneTakenAndCrossTenantFailAtomically() throws Exception {
    Tenant tenantA = persistTenant("merge-iso-a", "Merge Iso A");
    Tenant tenantB = persistTenant("merge-iso-b", "Merge Iso B");
    persistPlan(tenantA.getId(), PlanCode.FREE);
    persistPlan(tenantB.getId(), PlanCode.FREE);
    persistUser(tenantA.getId(), "owner-a@merge-iso.local", AppUserRole.pharmacy_owner);
    persistUser(tenantB.getId(), "owner-b@merge-iso.local", AppUserRole.pharmacy_owner);
    AppUser salesOnly =
        persistUser(tenantA.getId(), "sales@merge-iso.local", AppUserRole.pharmacy_staff);
    Cookie ownerA = login("owner-a@merge-iso.local");

    UUID salesRole = createRole(ownerA, "Sales only", "[\"SALES\"]");
    mockMvc.perform(putRoles(salesOnly.getId(), ownerA, salesRole)).andExpect(status().isOk());
    Cookie salesCookie = login("sales@merge-iso.local");

    UUID survivor = createCustomer(ownerA, "One", "9005000001");
    UUID duplicate = createCustomer(ownerA, "Two", "9005000002");
    UUID left = createCustomer(ownerA, "Left", "9005000011");

    mockMvc
        .perform(
            post("/api/v1/customers/merge")
                .cookie(salesCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mergeJson("PREVIEW", survivor, duplicate, "{}")))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"));

    mockMvc
        .perform(
            post("/api/v1/customers/merge")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mergeJson("PREVIEW", survivor, duplicate, "{}")))
        .andExpect(status().isUnauthorized());

    mockMvc
        .perform(
            post("/api/v1/customers/merge")
                .cookie(ownerA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mergeJson("EXECUTE", survivor, survivor, "{}")))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("STALE_STATE"));

    mockMvc
        .perform(
            post("/api/v1/customers/merge")
                .cookie(ownerA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    mergeJson(
                        "EXECUTE",
                        survivor,
                        duplicate,
                        "{\"name\":\"SURVIVOR\",\"phone\":\"SURVIVOR\"}")))
        .andExpect(status().isOk());

    mockMvc
        .perform(
            post("/api/v1/customers/merge")
                .cookie(ownerA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    mergeJson(
                        "EXECUTE",
                        survivor,
                        duplicate,
                        "{\"name\":\"SURVIVOR\",\"phone\":\"SURVIVOR\"}")))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("STALE_STATE"));

    Cookie ownerB = login("owner-b@merge-iso.local");
    UUID foreign = createCustomer(ownerB, "Foreign", "9005000088");
    mockMvc
        .perform(
            post("/api/v1/customers/merge")
                .cookie(ownerA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mergeJson("PREVIEW", left, foreign, "{}")))
        .andExpect(status().isNotFound());
  }

  private UUID createCustomer(Cookie cookie, String name, String phone) throws Exception {
    String body =
        mockMvc
            .perform(
                post("/api/v1/customers")
                    .cookie(cookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"name\":\"" + name + "\",\"phone\":\"" + phone + "\"}"))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return UUID.fromString(objectMapper.readTree(body).path("data").path("id").asText());
  }

  private UUID createCustomerFull(
      Cookie cookie,
      String name,
      String phone,
      String email,
      String bloodGroup,
      String allergies,
      String chronicConditions)
      throws Exception {
    String allergiesJson = allergies == null ? "null" : "\"" + allergies + "\"";
    String chronicJson = chronicConditions == null ? "null" : "\"" + chronicConditions + "\"";
    String body =
        mockMvc
            .perform(
                post("/api/v1/customers")
                    .cookie(cookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "name":"%s",
                          "phone":"%s",
                          "email":"%s",
                          "bloodGroup":"%s",
                          "allergies":%s,
                          "chronicConditions":%s
                        }
                        """
                            .formatted(name, phone, email, bloodGroup, allergiesJson, chronicJson)))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return UUID.fromString(objectMapper.readTree(body).path("data").path("id").asText());
  }

  private static String mergeJson(
      String mode, UUID survivorId, UUID duplicateId, String resolutions) {
    return """
        {
          "mode":"%s",
          "survivorId":"%s",
          "duplicateId":"%s",
          "resolutions":%s
        }
        """
        .formatted(mode, survivorId, duplicateId, resolutions);
  }

  private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder putRoles(
      UUID userId, Cookie owner, UUID roleId) {
    return org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put(
            "/api/v1/users/" + userId + "/roles")
        .cookie(owner)
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"roleIds\":[\"" + roleId + "\"]}");
  }

  private UUID createRole(Cookie owner, String name, String modulesJson) throws Exception {
    String body =
        mockMvc
            .perform(
                post("/api/v1/roles")
                    .cookie(owner)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"name\":\"" + name + "\",\"modules\":" + modulesJson + "}"))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return UUID.fromString(objectMapper.readTree(body).path("data").path("id").asText());
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

  private void persistPlan(UUID tenantId, PlanCode plan) {
    TenantSubscription sub = new TenantSubscription();
    sub.setId(UUID.randomUUID());
    sub.setTenantId(tenantId);
    sub.setPlanCode(plan);
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

  private Location persistBranch(UUID tenantId, String name, String code) {
    Location branch = new Location();
    branch.setId(UUID.randomUUID());
    branch.setTenantId(tenantId);
    branch.setName(name);
    branch.setBranchCode(code);
    branch.setAddressLine("12 MG Road");
    branch.setCity("Bengaluru");
    branch.setState("KA");
    branch.setPincode("560001");
    branch.setContactPhone("9876543210");
    branch.setDrugLicenseNumber("DL-" + code);
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
    Map<String, Object> pricing = new LinkedHashMap<>();
    pricing.put("defaultMarkupBps", 0);
    pricing.put("roundToNearestPaise", 1);
    branch.setPricingSettings(pricing);
    Map<String, Object> tax = new LinkedHashMap<>();
    tax.put("gstMode", "CGST_SGST");
    tax.put("taxState", "KA");
    branch.setTaxSettings(tax);
    branch.setCreatedAt(T0);
    branch.setUpdatedAt(T0);
    return locationRepository.saveAndFlush(branch);
  }

  private SalesInvoice persistInvoice(UUID tenantId, UUID branchId, UUID userId, UUID customerId) {
    SalesInvoice invoice = new SalesInvoice();
    invoice.setId(UUID.randomUUID());
    invoice.setTenantId(tenantId);
    invoice.setBranchId(branchId);
    invoice.setInvoiceNumber("INV/2026-27/BR01/" + invoice.getId().toString().substring(0, 5));
    invoice.setStatus(SalesInvoiceStatus.COMPLETED);
    invoice.setStaffUserId(userId);
    invoice.setTerminalId(UUID.randomUUID());
    invoice.setCustomerId(customerId);
    invoice.setSubtotalPaise(12_500);
    invoice.setDiscountPaise(0);
    invoice.setTaxPaise(0);
    invoice.setTotalPaise(12_500);
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
    return salesInvoiceRepository.saveAndFlush(invoice);
  }

  private void persistCredit(
      UUID tenantId, UUID customerId, UUID userId, UUID invoiceId, long amountPaise) {
    CustomerCreditAccount account = new CustomerCreditAccount();
    account.setId(UUID.randomUUID());
    account.setTenantId(tenantId);
    account.setCustomerId(customerId);
    account.setLimitPaise(1_000_000L);
    account.setBalancePaise(amountPaise);
    account.setVersion(1);
    account.setCreatedAt(T0);
    account.setUpdatedAt(T0);
    creditAccountRepository.saveAndFlush(account);
    CustomerCreditLedgerEntry entry = new CustomerCreditLedgerEntry();
    entry.setId(UUID.randomUUID());
    entry.setTenantId(tenantId);
    entry.setCustomerId(customerId);
    entry.setAccountId(account.getId());
    entry.setType(CustomerCreditLedgerType.SALE_CHARGE);
    entry.setAmountPaise(amountPaise);
    entry.setBalanceAfterPaise(amountPaise);
    entry.setInvoiceId(invoiceId);
    entry.setIdempotencyKey("chg-" + entry.getId());
    entry.setCreatedByUserId(userId);
    entry.setOccurredAt(T0);
    entry.setCreatedAt(T0);
    creditLedgerRepository.saveAndFlush(entry);
  }

  private void persistLoyalty(UUID tenantId, UUID customerId, UUID userId, long points) {
    CustomerLoyaltyAccount account = new CustomerLoyaltyAccount();
    account.setId(UUID.randomUUID());
    account.setTenantId(tenantId);
    account.setCustomerId(customerId);
    account.setBalancePoints(points);
    account.setVersion(1);
    account.setCreatedAt(T0);
    account.setUpdatedAt(T0);
    loyaltyAccountRepository.saveAndFlush(account);
    CustomerLoyaltyLedgerEntry entry = new CustomerLoyaltyLedgerEntry();
    entry.setId(UUID.randomUUID());
    entry.setTenantId(tenantId);
    entry.setCustomerId(customerId);
    entry.setAccountId(account.getId());
    entry.setType(LoyaltyLedgerType.ADJUSTMENT);
    entry.setPoints(points);
    entry.setDeltaPoints(points);
    entry.setBalanceAfterPoints(points);
    entry.setTaxablePaise(0);
    entry.setReason("seed");
    entry.setIdempotencyKey("loy-" + entry.getId());
    entry.setCreatedByUserId(userId);
    entry.setOccurredAt(T0);
    entry.setCreatedAt(T0);
    loyaltyLedgerRepository.saveAndFlush(entry);
  }

  private void persistHistory(UUID tenantId, UUID customerId, UUID invoiceId) {
    CustomerHistoryFact fact = new CustomerHistoryFact();
    fact.setId(UUID.randomUUID());
    fact.setTenantId(tenantId);
    fact.setCustomerId(customerId);
    fact.setType(CustomerHistoryFactType.PURCHASE);
    fact.setSummary("Sale");
    fact.setInvoiceId(invoiceId);
    fact.setAmountPaise(12_500L);
    fact.setOccurredAt(T0);
    fact.setCreatedAt(T0);
    historyFactRepository.saveAndFlush(fact);
  }

  private void persistRefill(UUID tenantId, UUID customerId, String medicine) {
    CustomerRefillSchedule refill = new CustomerRefillSchedule();
    refill.setId(UUID.randomUUID());
    refill.setTenantId(tenantId);
    refill.setCustomerId(customerId);
    refill.setMedicineName(medicine);
    refill.setIntervalDays(30);
    refill.setNextDueOn(LocalDate.of(2026, 10, 1));
    refill.setVersion(1);
    refill.setCreatedAt(T0);
    refill.setUpdatedAt(T0);
    refillScheduleRepository.saveAndFlush(refill);
  }

  private void persistTag(UUID tenantId, UUID customerId, String name) {
    CustomerTag tag = new CustomerTag();
    tag.setId(UUID.randomUUID());
    tag.setTenantId(tenantId);
    tag.setName(name);
    tag.setCreatedAt(T0);
    tag.setUpdatedAt(T0);
    customerTagRepository.saveAndFlush(tag);
    CustomerTagAssignment assignment = new CustomerTagAssignment();
    assignment.setTenantId(tenantId);
    assignment.setCustomerId(customerId);
    assignment.setTagId(tag.getId());
    assignment.setCreatedAt(T0);
    customerTagAssignmentRepository.saveAndFlush(assignment);
  }
}
