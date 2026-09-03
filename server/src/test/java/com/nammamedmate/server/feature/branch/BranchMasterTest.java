package com.nammamedmate.server.feature.branch;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import com.nammamedmate.server.persistence.SubscriptionOverrideEventRepository;
import com.nammamedmate.server.persistence.SubscriptionUpgradeIntentRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.persistence.TenantSubscriptionRepository;
import com.nammamedmate.server.persistence.UserSessionRepository;
import jakarta.servlet.http.Cookie;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Testcontainers
class BranchMasterTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-03T10:00:00Z");

  @Container
  static final PostgreSQLContainer<?> POSTGRES =
      new PostgreSQLContainer<>("postgres:16-alpine")
          .withDatabaseName("nammamedmate_branch_master")
          .withUsername("postgres")
          .withPassword("postgres");

  @DynamicPropertySource
  static void datasource(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
    registry.add("spring.datasource.username", POSTGRES::getUsername);
    registry.add("spring.datasource.password", POSTGRES::getPassword);
  }

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private UserSessionRepository userSessionRepository;
  @Autowired private LocationRepository locationRepository;
  @Autowired private KycSubmissionRepository kycSubmissionRepository;
  @Autowired private KycDocumentRepository kycDocumentRepository;
  @Autowired private TenantSubscriptionRepository tenantSubscriptionRepository;
  @Autowired private SubscriptionUpgradeIntentRepository subscriptionUpgradeIntentRepository;
  @Autowired private SubscriptionOverrideEventRepository subscriptionOverrideEventRepository;
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
    userSessionRepository.deleteAll();
    locationRepository.deleteAll();
    appUserRepository.deleteAll();
    tenantRepository.deleteAll();
  }

  @Test
  void ac01_kycApprovalCreatesEditableDefaultBranchFromKycAddress() throws Exception {
    Tenant tenant = persistTenant("asha", "Asha Chemist", TenantStatus.VERIFICATION_REQUIRED);
    AppUser owner = persistOwner(tenant.getId(), "owner@asha.local");
    persistUser(null, "ops@hq.local", AppUserRole.admin_super);
    UUID submissionId = persistSubmittedKyc(tenant.getId(), owner.getId());

    Cookie masterCookie = login("ops@hq.local");
    mockMvc
        .perform(post("/api/v1/admin/kyc/" + submissionId + "/approve").cookie(masterCookie))
        .andExpect(status().isOk());

    List<Location> branches =
        locationRepository.findAllByTenantIdAndDeletedAtIsNullOrderByBranchCodeAsc(tenant.getId());
    assertThat(branches).hasSize(1);
    Location branch = branches.get(0);
    assertThat(branch.isDefaultBranch()).isTrue();
    assertThat(branch.getBranchCode()).isEqualTo("BR01");
    assertThat(branch.getAddressLine()).isEqualTo("12 MG Road");
    assertThat(branch.getCity()).isEqualTo("Bengaluru");
    assertThat(branch.getState()).isEqualTo("KA");
    assertThat(branch.getPincode()).isEqualTo("560001");
    assertThat(branch.getDrugLicenseNumber()).isEqualTo("DL-ASHA-1");
    assertThat(branch.getContactPhone()).isEqualTo("9876543210");
    assertThat(branch.getBranchType()).isEqualTo(BranchType.RETAIL);
    assertThat(branch.getStatus()).isEqualTo(BranchStatus.ACTIVE);

    Cookie ownerCookie = login("owner@asha.local");
    mockMvc
        .perform(
            patch("/api/v1/branches/" + branch.getId())
                .cookie(ownerCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Asha Main Counter\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.name").value("Asha Main Counter"));
  }

  @Test
  void ac02_ac03_createGeneratesUniqueCodeAndPersistsFullFields() throws Exception {
    Tenant tenant = persistTenant("full", "Full Chemist", TenantStatus.ACTIVE);
    persistPlan(tenant.getId(), PlanCode.STARTER);
    persistOwner(tenant.getId(), "owner@full.local");
    Cookie cookie = login("owner@full.local");

    mockMvc
        .perform(
            post("/api/v1/branches")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(createBody("Main Outlet", true, "RETAIL", "DL-MAIN-1", 100)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.branchCode").value("BR01"))
        .andExpect(jsonPath("$.data.defaultBranch").value(true))
        .andExpect(jsonPath("$.data.drugLicenseNumber").value("DL-MAIN-1"))
        .andExpect(jsonPath("$.data.branchType").value("RETAIL"))
        .andExpect(jsonPath("$.data.linkedWarehouse").value(false))
        .andExpect(jsonPath("$.data.pricingSettings.defaultMarkupBps").value(100))
        .andExpect(jsonPath("$.data.taxSettings.gstMode").value("CGST_SGST"));

    mockMvc
        .perform(
            post("/api/v1/branches")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(createBody("Second Outlet", false, "RETAIL", "DL-SECOND-1", 200)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.branchCode").value("BR02"))
        .andExpect(jsonPath("$.data.defaultBranch").value(false));
  }

  @Test
  void ac04_kioskTypeDoesNotEnableSelfOrderFlag() throws Exception {
    Tenant tenant = persistTenant("kiosk", "Kiosk Chemist", TenantStatus.ACTIVE);
    persistOwner(tenant.getId(), "owner@kiosk.local");
    Cookie cookie = login("owner@kiosk.local");

    MvcResult result =
        mockMvc
            .perform(
                post("/api/v1/branches")
                    .cookie(cookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(createBody("Kiosk Counter", true, "KIOSK", "DL-KIOSK-1", 0)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.branchType").value("KIOSK"))
            .andReturn();

    JsonNode data = objectMapper.readTree(result.getResponse().getContentAsString()).path("data");
    assertThat(data.has("selfOrderEnabled")).isFalse();
    assertThat(data.path("linkedWarehouse").asBoolean()).isFalse();
  }

  @Test
  void ac05_exactlyOneActiveDefaultPerTenant() throws Exception {
    Tenant tenant = persistTenant("def", "Default Chemist", TenantStatus.ACTIVE);
    persistPlan(tenant.getId(), PlanCode.STARTER);
    persistOwner(tenant.getId(), "owner@def.local");
    Cookie cookie = login("owner@def.local");

    String firstId =
        objectMapper
            .readTree(
                mockMvc
                    .perform(
                        post("/api/v1/branches")
                            .cookie(cookie)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(createBody("First", true, "RETAIL", "DL-1", 0)))
                    .andExpect(status().isOk())
                    .andReturn()
                    .getResponse()
                    .getContentAsString())
            .path("data")
            .path("id")
            .asText();

    String secondId =
        objectMapper
            .readTree(
                mockMvc
                    .perform(
                        post("/api/v1/branches")
                            .cookie(cookie)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(createBody("Second", false, "RETAIL", "DL-2", 0)))
                    .andExpect(status().isOk())
                    .andReturn()
                    .getResponse()
                    .getContentAsString())
            .path("data")
            .path("id")
            .asText();

    mockMvc
        .perform(
            patch("/api/v1/branches/" + secondId)
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"defaultBranch\":true}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.defaultBranch").value(true));

    assertThat(
            locationRepository.findById(UUID.fromString(firstId)).orElseThrow().isDefaultBranch())
        .isFalse();
    assertThat(
            locationRepository.findById(UUID.fromString(secondId)).orElseThrow().isDefaultBranch())
        .isTrue();

    mockMvc
        .perform(
            patch("/api/v1/branches/" + secondId)
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"defaultBranch\":false}"))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("DEFAULT_REQUIRED"));

    mockMvc
        .perform(
            patch("/api/v1/branches/" + secondId)
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"INACTIVE\"}"))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("DEFAULT_REQUIRED"));
  }

  @Test
  void ac06_ac07_pricingTaxDifferAndCopyIsSnapshot() throws Exception {
    Tenant tenant = persistTenant("price", "Price Chemist", TenantStatus.ACTIVE);
    persistPlan(tenant.getId(), PlanCode.STARTER);
    persistOwner(tenant.getId(), "owner@price.local");
    Cookie cookie = login("owner@price.local");

    String sourceId =
        objectMapper
            .readTree(
                mockMvc
                    .perform(
                        post("/api/v1/branches")
                            .cookie(cookie)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(createBody("Source", true, "RETAIL", "DL-S", 500)))
                    .andExpect(status().isOk())
                    .andReturn()
                    .getResponse()
                    .getContentAsString())
            .path("data")
            .path("id")
            .asText();

    String targetId =
        objectMapper
            .readTree(
                mockMvc
                    .perform(
                        post("/api/v1/branches")
                            .cookie(cookie)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(createBody("Target", false, "RETAIL", "DL-T", 0)))
                    .andExpect(status().isOk())
                    .andReturn()
                    .getResponse()
                    .getContentAsString())
            .path("data")
            .path("id")
            .asText();

    mockMvc
        .perform(
            post("/api/v1/branches/" + targetId + "/copy-settings")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"sourceBranchId\":\"" + sourceId + "\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.pricingSettings.defaultMarkupBps").value(500));

    mockMvc
        .perform(
            patch("/api/v1/branches/" + sourceId)
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"pricingSettings\":{\"defaultMarkupBps\":900,\"roundToNearestPaise\":1}}"))
        .andExpect(status().isOk());

    assertThat(
            locationRepository
                .findById(UUID.fromString(targetId))
                .orElseThrow()
                .getPricingSettings()
                .get("defaultMarkupBps"))
        .isEqualTo(500);
    assertThat(
            locationRepository
                .findById(UUID.fromString(sourceId))
                .orElseThrow()
                .getPricingSettings()
                .get("defaultMarkupBps"))
        .isEqualTo(900);
  }

  @Test
  void ac08_missingLicenseInvalidHoursCrossTenantAndMasterRead() throws Exception {
    Tenant tenantA = persistTenant("iso-a", "Iso A", TenantStatus.ACTIVE);
    Tenant tenantB = persistTenant("iso-b", "Iso B", TenantStatus.ACTIVE);
    persistOwner(tenantA.getId(), "owner-a@iso.local");
    persistOwner(tenantB.getId(), "owner-b@iso.local");
    persistUser(null, "ops@hq.local", AppUserRole.admin_super);
    Cookie ownerA = login("owner-a@iso.local");
    Cookie ownerB = login("owner-b@iso.local");
    Cookie master = login("ops@hq.local");

    mockMvc
        .perform(
            post("/api/v1/branches")
                .cookie(ownerA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(createBody("Main", true, "RETAIL", "", 0)))
        .andExpect(status().isBadRequest());

    String valid =
        """
        {
          "name":"Main",
          "addressLine":"1 Road",
          "city":"Bengaluru",
          "state":"KA",
          "pincode":"560001",
          "contactPhone":"9876543210",
          "drugLicenseNumber":"DL-OK",
          "branchType":"RETAIL",
          "defaultBranch":true,
          "operatingHours":{"mon":{"open":"21:00","close":"09:00"}}
        }
        """;
    mockMvc
        .perform(
            post("/api/v1/branches")
                .cookie(ownerA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(valid))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("INVALID_HOURS"));

    String branchId =
        objectMapper
            .readTree(
                mockMvc
                    .perform(
                        post("/api/v1/branches")
                            .cookie(ownerA)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(createBody("Main", true, "RETAIL", "DL-A", 0)))
                    .andExpect(status().isOk())
                    .andReturn()
                    .getResponse()
                    .getContentAsString())
            .path("data")
            .path("id")
            .asText();

    mockMvc
        .perform(get("/api/v1/branches/" + branchId).cookie(ownerB))
        .andExpect(status().isNotFound());

    mockMvc
        .perform(get("/api/v1/branches").cookie(ownerB))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items.length()").value(0));

    mockMvc
        .perform(get("/api/v1/admin/tenants/" + tenantA.getId() + "/branches").cookie(ownerA))
        .andExpect(status().isForbidden());

    mockMvc
        .perform(get("/api/v1/admin/tenants/" + tenantA.getId() + "/branches").cookie(master))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items[0].branchCode").value("BR01"))
        .andExpect(jsonPath("$.data.items[0].drugLicenseNumber").value("DL-A"));

    assertThat(
            locationRepository.findAllByTenantIdAndDeletedAtIsNullOrderByBranchCodeAsc(
                tenantB.getId()))
        .isEmpty();
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

  private AppUser persistOwner(UUID tenantId, String email) {
    return persistUser(tenantId, email, AppUserRole.pharmacy_owner);
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
