package com.nammamedmate.server.feature.subscription;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.nammamedmate.server.AbstractIntegrationTest;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.BranchStatus;
import com.nammamedmate.server.domain.BranchType;
import com.nammamedmate.server.domain.KycDocType;
import com.nammamedmate.server.domain.KycDocument;
import com.nammamedmate.server.domain.KycSubmission;
import com.nammamedmate.server.domain.KycSubmissionStatus;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.SubscriptionStatus;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TenantStatus;
import com.nammamedmate.server.domain.TenantSubscription;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.KycDocumentRepository;
import com.nammamedmate.server.persistence.KycSubmissionRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.NotificationDeliveryRepository;
import com.nammamedmate.server.persistence.NotificationEventRepository;
import com.nammamedmate.server.persistence.NotificationRepository;
import com.nammamedmate.server.persistence.NotificationSourceRepository;
import com.nammamedmate.server.persistence.StaffRegistrationRepository;
import com.nammamedmate.server.persistence.SubscriptionOverrideEventRepository;
import com.nammamedmate.server.persistence.SubscriptionUpgradeIntentRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.persistence.TenantSubscriptionRepository;
import com.nammamedmate.server.persistence.UserSessionRepository;
import com.nammamedmate.server.infrastructure.cashfree.CashfreePgAdapter;
import jakarta.servlet.http.Cookie;
import java.time.Instant;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

class SubscriptionTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-03T10:00:00Z");

  @MockBean private CashfreePgAdapter cashfreePgAdapter;

  @Autowired private MockMvc mockMvc;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private UserSessionRepository userSessionRepository;
  @Autowired private LocationRepository locationRepository;
  @Autowired private KycSubmissionRepository kycSubmissionRepository;
  @Autowired private KycDocumentRepository kycDocumentRepository;
  @Autowired private TenantSubscriptionRepository tenantSubscriptionRepository;
  @Autowired private SubscriptionUpgradeIntentRepository subscriptionUpgradeIntentRepository;
  @Autowired private SubscriptionOverrideEventRepository subscriptionOverrideEventRepository;
  @Autowired private StaffRegistrationRepository staffRegistrationRepository;
  @Autowired private NotificationRepository notificationRepository;
  @Autowired private NotificationDeliveryRepository notificationDeliveryRepository;
  @Autowired private NotificationEventRepository notificationEventRepository;
  @Autowired private NotificationSourceRepository notificationSourceRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @BeforeEach
  void wipe() {
    notificationDeliveryRepository.deleteAll();
    notificationEventRepository.deleteAll();
    notificationRepository.deleteAll();
    notificationSourceRepository.deleteAll();
    kycDocumentRepository.deleteAll();
    kycSubmissionRepository.deleteAll();
    subscriptionOverrideEventRepository.deleteAll();
    subscriptionUpgradeIntentRepository.deleteAll();
    tenantSubscriptionRepository.deleteAll();
    staffRegistrationRepository.deleteAll();
    userSessionRepository.deleteAll();
    locationRepository.deleteAll();
    appUserRepository.deleteAll();
    tenantRepository.deleteAll();
  }

  @Test
  void ac01_kycApprovalAssignsFreePlan() throws Exception {
    Tenant tenant = persistTenant("asha", "Asha Chemist", TenantStatus.VERIFICATION_REQUIRED);
    AppUser owner = persistOwner(tenant.getId(), "owner@asha.local");
    persistUser(null, "ops@hq.local", AppUserRole.admin_super);
    UUID submissionId = persistSubmittedKyc(tenant.getId(), owner.getId());

    Cookie masterCookie = login("ops@hq.local");
    mockMvc
        .perform(post("/api/v1/admin/kyc/" + submissionId + "/approve").cookie(masterCookie))
        .andExpect(status().isOk());

    Cookie ownerCookie = login("owner@asha.local");
    mockMvc
        .perform(get("/api/v1/subscriptions/current").cookie(ownerCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.planCode").value("FREE"))
        .andExpect(jsonPath("$.data.status").value("ACTIVE"))
        .andExpect(jsonPath("$.data.branchesUsed").value(1))
        .andExpect(jsonPath("$.data.effectiveBranchLimit").value(1));
  }

  @Test
  void ac02_ac04_branchLimitBlocksWithUpgradeReason() throws Exception {
    Tenant tenant = persistTenant("cap-br", "Cap Branch", TenantStatus.ACTIVE);
    persistPlan(tenant.getId(), PlanCode.FREE);
    persistOwner(tenant.getId(), "owner@cap-br.local");
    persistBranch(tenant.getId(), "Main", "BR01", true);
    Cookie cookie = login("owner@cap-br.local");

    MvcResult result =
        mockMvc
            .perform(
                post("/api/v1/branches")
                    .cookie(cookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(createBody("Second Outlet", false, "RETAIL", "DL-SECOND-1", 0)))
            .andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.code").value("PLAN_LIMIT"))
            .andReturn();

    String body = result.getResponse().getContentAsString();
    assertThat(body.contains("outlet") || body.contains("Upgrade")).isTrue();
    assertThat(
            locationRepository.findAllByTenantIdAndDeletedAtIsNullOrderByBranchCodeAsc(
                tenant.getId()))
        .hasSize(1);
  }

  @Test
  void ac02_ac04_userLimitBlocksWithUpgradeReason() throws Exception {
    Tenant tenant = persistTenant("cap-user", "Cap User", TenantStatus.ACTIVE);
    persistPlan(tenant.getId(), PlanCode.FREE);
    persistOwner(tenant.getId(), "owner@cap-user.local");
    persistStaff(tenant.getId(), "one@cap-user.local");
    persistStaff(tenant.getId(), "two@cap-user.local");
    Cookie cookie = login("owner@cap-user.local");

    MvcResult result =
        mockMvc
            .perform(
                post("/api/v1/users")
                    .cookie(cookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(staffCreateJson("three@cap-user.local")))
            .andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.code").value("PLAN_LIMIT"))
            .andReturn();

    String body = result.getResponse().getContentAsString();
    assertThat(body.contains("staff") || body.contains("Upgrade")).isTrue();
    assertThat(appUserRepository.findByNormalizedEmailAndDeletedAtIsNull("three@cap-user.local"))
        .isEmpty();
  }

  @Test
  void ac03_ownerSelfServeUpgrade() throws Exception {
    Tenant tenant = persistTenant("up", "Upgrade Chemist", TenantStatus.ACTIVE);
    persistPlan(tenant.getId(), PlanCode.FREE);
    persistOwner(tenant.getId(), "owner@up.local");
    Cookie cookie = login("owner@up.local");
    String key = UUID.randomUUID().toString();

    mockMvc
        .perform(get("/api/v1/subscriptions/catalogue").cookie(cookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.plans.length()").value(4));

    mockMvc
        .perform(
            post("/api/v1/subscriptions/upgrade")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(upgradeBody("STARTER", key)))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("PAYMENT_REQUIRED"));

    assertThat(
            tenantSubscriptionRepository.findByTenantId(tenant.getId()).orElseThrow().getPlanCode())
        .isEqualTo(PlanCode.FREE);
  }

  @Test
  void ac03_masterOverridePlanStatusExpiryAndBranchCap() throws Exception {
    Tenant tenant = persistTenant("ovr", "Override Chemist", TenantStatus.ACTIVE);
    persistPlan(tenant.getId(), PlanCode.FREE);
    persistOwner(tenant.getId(), "owner@ovr.local");
    persistUser(null, "ops@hq.local", AppUserRole.admin_super);
    Cookie master = login("ops@hq.local");

    mockMvc
        .perform(
            post("/api/v1/admin/subscriptions/" + tenant.getId() + "/override")
                .cookie(master)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "planCode":"PRO",
                      "status":"ACTIVE",
                      "expiresAt":null,
                      "branchLimitOverride":10,
                      "reason":"manual PRO grant for capacity"
                    }
                    """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.planCode").value("PRO"))
        .andExpect(jsonPath("$.data.status").value("ACTIVE"))
        .andExpect(jsonPath("$.data.branchLimitOverride").value(10))
        .andExpect(jsonPath("$.data.effectiveBranchLimit").value(10));

    mockMvc
        .perform(get("/api/v1/admin/subscriptions").cookie(master))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items[0].planCode").value("PRO"))
        .andExpect(jsonPath("$.data.items[0].branchLimitOverride").value(10));

    mockMvc
        .perform(get("/api/v1/admin/subscriptions/" + tenant.getId() + "/overrides").cookie(master))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items.length()").value(1))
        .andExpect(jsonPath("$.data.items[0].beforePlan").value("FREE"))
        .andExpect(jsonPath("$.data.items[0].afterPlan").value("PRO"))
        .andExpect(jsonPath("$.data.items[0].afterBranchLimitOverride").value(10))
        .andExpect(jsonPath("$.data.items[0].reason").value("manual PRO grant for capacity"));

    Cookie owner = login("owner@ovr.local");
    mockMvc
        .perform(get("/api/v1/subscriptions/current").cookie(owner))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.planCode").value("PRO"))
        .andExpect(jsonPath("$.data.effectiveBranchLimit").value(10));
  }

  @Test
  void ac05_downgradeConflictWhenOverLimit() throws Exception {
    Tenant tenant = persistTenant("down", "Down Chemist", TenantStatus.ACTIVE);
    persistPlan(tenant.getId(), PlanCode.STARTER);
    persistOwner(tenant.getId(), "owner@down.local");
    persistBranch(tenant.getId(), "Main", "BR01", true);
    persistBranch(tenant.getId(), "Second", "BR02", false);
    Cookie cookie = login("owner@down.local");
    String key = UUID.randomUUID().toString();

    mockMvc
        .perform(
            post("/api/v1/subscriptions/upgrade")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(upgradeBody("FREE", key)))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("DOWNGRADE_CONFLICT"));

    assertThat(subscriptionUpgradeIntentRepository.findByIdempotencyKey(key)).isEmpty();
    assertThat(
            tenantSubscriptionRepository.findByTenantId(tenant.getId()).orElseThrow().getPlanCode())
        .isEqualTo(PlanCode.STARTER);
  }

  @Test
  void ac05_paymentCallbackReplayIsIdempotent() throws Exception {
    Tenant tenant = persistTenant("pay", "Pay Chemist", TenantStatus.ACTIVE);
    persistPlan(tenant.getId(), PlanCode.FREE);
    persistOwner(tenant.getId(), "owner@pay.local");
    Cookie cookie = login("owner@pay.local");
    String callbackBody =
        "{\"intentId\":\""
            + UUID.randomUUID()
            + "\",\"idempotencyKey\":\""
            + UUID.randomUUID()
            + "\"}";

    mockMvc
        .perform(
            post("/api/v1/subscriptions/payment-callback")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(callbackBody))
        .andExpect(status().isNotFound());
    mockMvc
        .perform(
            post("/api/v1/subscriptions/payment-callback")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(callbackBody))
        .andExpect(status().isNotFound());

    assertThat(
            tenantSubscriptionRepository.findByTenantId(tenant.getId()).orElseThrow().getPlanCode())
        .isEqualTo(PlanCode.FREE);
  }

  @Test
  void ac05_paymentCallbackCrossTenantIsUndisclosed() throws Exception {
    Tenant tenantA = persistTenant("pay-a", "Pay A", TenantStatus.ACTIVE);
    persistPlan(tenantA.getId(), PlanCode.FREE);
    persistOwner(tenantA.getId(), "owner@pay-a.local");
    Tenant tenantB = persistTenant("pay-b", "Pay B", TenantStatus.ACTIVE);
    persistPlan(tenantB.getId(), PlanCode.FREE);
    persistOwner(tenantB.getId(), "owner@pay-b.local");

    Cookie cookieB = login("owner@pay-b.local");
    String denied =
        mockMvc
            .perform(
                post("/api/v1/subscriptions/payment-callback")
                    .cookie(cookieB)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        "{\"intentId\":\""
                            + UUID.randomUUID()
                            + "\",\"idempotencyKey\":\""
                            + UUID.randomUUID()
                            + "\"}"))
            .andExpect(status().isNotFound())
            .andReturn()
            .getResponse()
            .getContentAsString();
    assertThat(denied).doesNotContain("pay-a").doesNotContain(tenantA.getId().toString());
    assertThat(
            tenantSubscriptionRepository
                .findByTenantId(tenantA.getId())
                .orElseThrow()
                .getPlanCode())
        .isEqualTo(PlanCode.FREE);
    assertThat(
            tenantSubscriptionRepository
                .findByTenantId(tenantB.getId())
                .orElseThrow()
                .getPlanCode())
        .isEqualTo(PlanCode.FREE);
  }

  @Test
  void ac05_staffCannotAccessSubscriptions() throws Exception {
    Tenant tenant = persistTenant("staff-sub", "Staff Sub", TenantStatus.ACTIVE);
    persistPlan(tenant.getId(), PlanCode.FREE);
    persistOwner(tenant.getId(), "owner@staff-sub.local");
    persistStaff(tenant.getId(), "clerk@staff-sub.local");
    Cookie staff = login("clerk@staff-sub.local");

    mockMvc
        .perform(get("/api/v1/subscriptions/catalogue").cookie(staff))
        .andExpect(status().isForbidden());
    mockMvc
        .perform(get("/api/v1/subscriptions/current").cookie(staff))
        .andExpect(status().isForbidden());
  }

  @Test
  void ac05_ownerCannotAdminOverride() throws Exception {
    Tenant tenant = persistTenant("own-ovr", "Owner Override", TenantStatus.ACTIVE);
    persistPlan(tenant.getId(), PlanCode.FREE);
    persistOwner(tenant.getId(), "owner@own-ovr.local");
    Cookie owner = login("owner@own-ovr.local");

    mockMvc
        .perform(
            post("/api/v1/admin/subscriptions/" + tenant.getId() + "/override")
                .cookie(owner)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "planCode":"PRO",
                      "status":"ACTIVE",
                      "expiresAt":null,
                      "branchLimitOverride":10,
                      "reason":"owner should not override"
                    }
                    """))
        .andExpect(status().isForbidden());

    assertThat(subscriptionOverrideEventRepository.count()).isZero();
    assertThat(
            tenantSubscriptionRepository.findByTenantId(tenant.getId()).orElseThrow().getPlanCode())
        .isEqualTo(PlanCode.FREE);
  }

  private String createBody(
      String name, boolean defaultBranch, String type, String license, int markup) {
    return """
        {
          "name":"%s",
          "addressLine":"12 MG Road",
          "city":"Bengaluru",
          "state":"KA",
          "pincode":"560001",
          "contactPhone":"9876543210",
          "contactEmail":"counter@example.com",
          "drugLicenseNumber":"%s",
          "gstin":"29ABCDE1234F1Z5",
          "operatingHours":{"mon":{"open":"09:00","close":"21:00"},"sun":{"closed":true}},
          "branchType":"%s",
          "status":"ACTIVE",
          "openingDate":"2026-09-01",
          "defaultBranch":%s,
          "linkedWarehouse":false,
          "pricingSettings":{"defaultMarkupBps":%d,"roundToNearestPaise":1},
          "taxSettings":{"gstMode":"CGST_SGST","defaultGstRateBps":1200,"taxState":"KA"}
        }
        """
        .formatted(name, license, type, defaultBranch, markup);
  }

  private static String staffCreateJson(String email) {
    return "{\"displayName\":\"Asha\",\"phone\":\"9876543210\",\"email\":\""
        + email
        + "\",\"password\":\"till-pass-1\",\"role\":\"pharmacy_staff\",\"kind\":\"STAFF\"}";
  }

  private static String upgradeBody(String planCode, String idempotencyKey) {
    return "{\"planCode\":\"" + planCode + "\",\"idempotencyKey\":\"" + idempotencyKey + "\"}";
  }

  private UUID persistSubmittedKyc(UUID tenantId, UUID submittedBy) {
    KycSubmission submission = new KycSubmission();
    submission.setId(UUID.randomUUID());
    submission.setTenantId(tenantId);
    submission.setLegalName("Asha Retail Pvt Ltd");
    submission.setDrugLicenseNumber("DL-ASHA-1");
    submission.setPan("ABCDE1234F");
    submission.setGstin(null);
    submission.setAddressLine1("12 MG Road");
    submission.setCity("Bengaluru");
    submission.setState("KA");
    submission.setPincode("560001");
    submission.setContactPhone("9876543210");
    submission.setStatus(KycSubmissionStatus.SUBMITTED);
    submission.setSubmittedBy(submittedBy);
    submission.setSubmittedAt(T0);
    submission.setVersion(0);
    submission.setCreatedAt(T0);
    submission.setUpdatedAt(T0);
    kycSubmissionRepository.saveAndFlush(submission);

    KycDocument document = new KycDocument();
    document.setId(UUID.randomUUID());
    document.setTenantId(tenantId);
    document.setSubmissionId(submission.getId());
    document.setDocType(KycDocType.DRUG_LICENSE);
    document.setContentType("application/pdf");
    document.setByteSize(12L);
    document.setStorageKey("test/" + submission.getId() + "/drug.pdf");
    document.setOriginalFilename("drug.pdf");
    document.setCreatedAt(T0);
    kycDocumentRepository.saveAndFlush(document);
    return submission.getId();
  }

  private Tenant persistTenant(String slug, String name, TenantStatus status) {
    Tenant tenant = new Tenant();
    tenant.setId(UUID.randomUUID());
    tenant.setSlug(slug);
    tenant.setName(name);
    tenant.setStatus(status);
    tenant.setEmailVerifiedAt(T0);
    tenant.setCreatedAt(T0);
    tenant.setUpdatedAt(T0);
    return tenantRepository.saveAndFlush(tenant);
  }

  private void persistPlan(UUID tenantId, PlanCode planCode) {
    TenantSubscription subscription = new TenantSubscription();
    subscription.setId(UUID.randomUUID());
    subscription.setTenantId(tenantId);
    subscription.setPlanCode(planCode);
    subscription.setStatus(SubscriptionStatus.ACTIVE);
    subscription.setStartedAt(T0);
    subscription.setCreatedAt(T0);
    subscription.setUpdatedAt(T0);
    tenantSubscriptionRepository.saveAndFlush(subscription);
  }

  private Location persistBranch(UUID tenantId, String name, String code, boolean defaultBranch) {
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
    branch.setDefaultBranch(defaultBranch);
    branch.setLinkedWarehouse(false);
    Map<String, Object> pricing = new LinkedHashMap<>();
    pricing.put("defaultMarkupBps", 0);
    pricing.put("roundToNearestPaise", 1);
    branch.setPricingSettings(pricing);
    Map<String, Object> tax = new LinkedHashMap<>();
    tax.put("gstMode", "CGST_SGST");
    tax.put("defaultGstRateBps", 1200);
    tax.put("taxState", "KA");
    branch.setTaxSettings(tax);
    branch.setCreatedAt(T0);
    branch.setUpdatedAt(T0);
    return locationRepository.saveAndFlush(branch);
  }

  private AppUser persistOwner(UUID tenantId, String email) {
    return persistUser(tenantId, email, AppUserRole.pharmacy_owner);
  }

  private AppUser persistStaff(UUID tenantId, String email) {
    return persistUser(tenantId, email, AppUserRole.pharmacy_staff);
  }

  private AppUser persistUser(UUID tenantId, String email, AppUserRole role) {
    AppUser user = new AppUser();
    user.setId(UUID.randomUUID());
    user.setTenantId(tenantId);
    user.setEmail(email);
    user.setPasswordHash(passwordEncoder.encode(PASSWORD));
    user.setDisplayName("Test " + email);
    user.setRole(role);
    user.setActive(true);
    user.setStatus(UserAccountStatus.ACTIVE);
    user.setCreatedAt(T0);
    user.setUpdatedAt(T0);
    return appUserRepository.saveAndFlush(user);
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
}
