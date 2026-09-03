package com.nammamedmate.server.feature.kyc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.KycSubmissionStatus;
import com.nammamedmate.server.domain.Notification;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TenantStatus;
import com.nammamedmate.server.domain.TenantSubscription;
import com.nammamedmate.server.domain.UserAccessRole;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.KycDocumentRepository;
import com.nammamedmate.server.persistence.KycSubmissionRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.NotificationDeliveryRepository;
import com.nammamedmate.server.persistence.NotificationEventRepository;
import com.nammamedmate.server.persistence.NotificationRepository;
import com.nammamedmate.server.persistence.NotificationSourceRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.persistence.TenantSubscriptionRepository;
import com.nammamedmate.server.persistence.UserAccessRoleRepository;
import com.nammamedmate.server.persistence.UserSessionRepository;
import jakarta.servlet.http.Cookie;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockMultipartHttpServletRequestBuilder;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Testcontainers
class TenantKycTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final UUID VERIFICATION_AGENT_ROLE =
      UUID.fromString("22222222-2222-2222-2222-000000000001");

  @Container
  static final PostgreSQLContainer<?> POSTGRES =
      new PostgreSQLContainer<>("postgres:16-alpine")
          .withDatabaseName("nammamedmate_kyc")
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
  @Autowired private KycSubmissionRepository kycSubmissionRepository;
  @Autowired private KycDocumentRepository kycDocumentRepository;
  @Autowired private TenantSubscriptionRepository tenantSubscriptionRepository;
  @Autowired private LocationRepository locationRepository;
  @Autowired private UserAccessRoleRepository userAccessRoleRepository;
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
    tenantSubscriptionRepository.deleteAll();
    locationRepository.deleteAll();
    userAccessRoleRepository.deleteAll();
    userSessionRepository.deleteAll();
    appUserRepository.deleteAll();
    tenantRepository.deleteAll();
  }

  @Test
  void ac01_ownerUploadsKycAfterEmailVerification() throws Exception {
    Tenant tenant = persistPendingTenant("asha-chemist", "Asha Chemist");
    persistOwner(tenant.getId(), "owner@asha.local");
    Cookie cookie = login("owner@asha.local");

    mockMvc
        .perform(kycMultipart(tenant.getId()).cookie(cookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data.status").value("SUBMITTED"))
        .andExpect(jsonPath("$.data.tenantStatus").value("VERIFICATION_REQUIRED"))
        .andExpect(jsonPath("$.data.documents.length()").value(2));

    assertThat(
            kycSubmissionRepository.findByTenantIdAndStatus(
                tenant.getId(), KycSubmissionStatus.SUBMITTED))
        .isPresent();
    assertThat(tenantRepository.findById(tenant.getId()).orElseThrow().getStatus())
        .isEqualTo(TenantStatus.VERIFICATION_REQUIRED);
  }

  @Test
  void ac02_masterAndTenantKycAgentCanReview() throws Exception {
    Tenant tenant = persistPendingTenant("review-chemist", "Review Chemist");
    persistOwner(tenant.getId(), "owner@review.local");
    persistUser(null, "ops@hq.local", AppUserRole.admin_super, null);
    AppUser agent = persistUser(null, "agent@hq.local", AppUserRole.admin_verification, null);
    assignVerificationDesk(agent.getId());

    Cookie ownerCookie = login("owner@review.local");
    String submissionId = submitAndId(tenant.getId(), ownerCookie);

    Cookie masterCookie = login("ops@hq.local");
    mockMvc
        .perform(get("/api/v1/admin/kyc").cookie(masterCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items[0].id").value(submissionId));

    Cookie agentCookie = login("agent@hq.local");
    mockMvc
        .perform(get("/api/v1/admin/kyc/" + submissionId).cookie(agentCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.legalName").value("Asha Retail Pvt Ltd"));

    mockMvc
        .perform(post("/api/v1/admin/kyc/" + submissionId + "/approve").cookie(agentCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("APPROVED"));
  }

  @Test
  void ac01_submitBeforeEmailVerifyIsRejected() throws Exception {
    Tenant tenant = persistPendingTenant("unverified", "Unverified");
    persistOwner(tenant.getId(), "owner@unverified.local");
    Cookie cookie = login("owner@unverified.local");
    Tenant locked = tenantRepository.findById(tenant.getId()).orElseThrow();
    locked.setEmailVerifiedAt(null);
    tenantRepository.saveAndFlush(locked);

    mockMvc
        .perform(kycMultipart(tenant.getId()).cookie(cookie))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("EMAIL_UNVERIFIED"));
    assertThat(kycSubmissionRepository.findAll()).isEmpty();
  }

  @Test
  void ac02_reviewerCanDownloadEvidence() throws Exception {
    Tenant tenant = persistPendingTenant("doc-chemist", "Doc Chemist");
    persistOwner(tenant.getId(), "owner@doc.local");
    persistUser(null, "ops@hq.local", AppUserRole.admin_super, null);
    Cookie ownerCookie = login("owner@doc.local");
    String submissionId = submitAndId(tenant.getId(), ownerCookie);
    String documentId =
        kycDocumentRepository.findAll().stream()
            .filter(doc -> doc.getSubmissionId().equals(UUID.fromString(submissionId)))
            .findFirst()
            .orElseThrow()
            .getId()
            .toString();

    Cookie masterCookie = login("ops@hq.local");
    mockMvc
        .perform(
            get("/api/v1/admin/kyc/" + submissionId + "/documents/" + documentId)
                .cookie(masterCookie))
        .andExpect(status().isOk())
        .andExpect(
            result ->
                assertThat(result.getResponse().getContentType()).contains("application/pdf"));
  }

  @Test
  void ac03_rejectionIncludesReasonAndAllowsResubmission() throws Exception {
    Tenant tenant = persistPendingTenant("reject-chemist", "Reject Chemist");
    persistOwner(tenant.getId(), "owner@reject.local");
    persistUser(null, "ops@hq.local", AppUserRole.admin_super, null);
    Cookie ownerCookie = login("owner@reject.local");
    String submissionId = submitAndId(tenant.getId(), ownerCookie);

    Cookie masterCookie = login("ops@hq.local");
    mockMvc
        .perform(
            post("/api/v1/admin/kyc/" + submissionId + "/reject")
                .cookie(masterCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"reason\":\"Drug license scan is illegible\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("REJECTED"))
        .andExpect(jsonPath("$.data.rejectionReason").value("Drug license scan is illegible"));

    mockMvc
        .perform(get("/api/v1/tenants/" + tenant.getId() + "/kyc").cookie(ownerCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("REJECTED"))
        .andExpect(jsonPath("$.data.rejectionReason").value("Drug license scan is illegible"));

    mockMvc
        .perform(kycMultipart(tenant.getId()).cookie(ownerCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("SUBMITTED"));

    assertThat(kycSubmissionRepository.findAll()).hasSize(2);
  }

  @Test
  void ac04_approvalUnlocksTenantAndAssignsFreePlan() throws Exception {
    Tenant tenant = persistPendingTenant("free-chemist", "Free Chemist");
    persistOwner(tenant.getId(), "owner@free.local");
    persistUser(null, "ops@hq.local", AppUserRole.admin_super, null);
    Cookie ownerCookie = login("owner@free.local");
    String submissionId = submitAndId(tenant.getId(), ownerCookie);

    Cookie masterCookie = login("ops@hq.local");
    mockMvc
        .perform(post("/api/v1/admin/kyc/" + submissionId + "/approve").cookie(masterCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("APPROVED"));

    assertThat(tenantRepository.findById(tenant.getId()).orElseThrow().getStatus())
        .isEqualTo(TenantStatus.ACTIVE);
    TenantSubscription subscription =
        tenantSubscriptionRepository.findByTenantId(tenant.getId()).orElseThrow();
    assertThat(subscription.getPlanCode()).isEqualTo(PlanCode.FREE);

    assertThat(
            locationRepository.findAllByTenantIdAndDeletedAtIsNullOrderByBranchCodeAsc(
                tenant.getId()))
        .hasSize(1)
        .first()
        .satisfies(
            branch -> {
              assertThat(branch.isDefaultBranch()).isTrue();
              assertThat(branch.getAddressLine()).isEqualTo("12 MG Road");
              assertThat(branch.getDrugLicenseNumber()).isEqualTo("KA-DL-2026-001");
            });

    mockMvc
        .perform(get("/api/v1/notifications").cookie(ownerCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items[0].sourceType").value("kyc"));

    List<Notification> notes = notificationRepository.findAll();
    assertThat(notes).isNotEmpty();
  }

  @Test
  void ac05_unsupportedMissingDuplicateUnauthorizedAndCrossTenantFailSafely() throws Exception {
    Tenant tenantA = persistPendingTenant("iso-a", "Iso A");
    Tenant tenantB = persistPendingTenant("iso-b", "Iso B");
    persistOwner(tenantA.getId(), "owner-a@iso.local");
    persistOwner(tenantB.getId(), "owner-b@iso.local");
    persistUser(null, "ops@hq.local", AppUserRole.admin_super, null);
    AppUser bareAgent = persistUser(null, "bare@hq.local", AppUserRole.admin_verification, null);
    Cookie ownerA = login("owner-a@iso.local");
    Cookie ownerB = login("owner-b@iso.local");

    mockMvc
        .perform(
            multipart("/api/v1/tenants/" + tenantA.getId() + "/kyc")
                .file(pdf("drugLicense", "license.pdf"))
                .file(
                    new MockMultipartFile(
                        "panDocument",
                        "pan.txt",
                        "text/plain",
                        "not-a-pdf".getBytes(StandardCharsets.UTF_8)))
                .param("legalName", "A")
                .param("drugLicenseNumber", "DL-1")
                .param("pan", "ABCDE1234F")
                .param("addressLine1", "1 Road")
                .param("city", "Bengaluru")
                .param("state", "KA")
                .param("pincode", "560001")
                .param("contactPhone", "9876543210")
                .cookie(ownerA))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("UNSUPPORTED_FILE"));

    mockMvc
        .perform(
            multipart("/api/v1/tenants/" + tenantA.getId() + "/kyc")
                .file(pdf("drugLicense", "license.pdf"))
                .param("legalName", "A")
                .param("drugLicenseNumber", "DL-1")
                .param("pan", "ABCDE1234F")
                .param("addressLine1", "1 Road")
                .param("city", "Bengaluru")
                .param("state", "KA")
                .param("pincode", "560001")
                .param("contactPhone", "9876543210")
                .cookie(ownerA))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("MISSING_EVIDENCE"));

    String submissionId = submitAndId(tenantA.getId(), ownerA);
    mockMvc
        .perform(kycMultipart(tenantA.getId()).cookie(ownerA))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("KYC_CONFLICT"));

    mockMvc
        .perform(get("/api/v1/tenants/" + tenantA.getId() + "/kyc").cookie(ownerB))
        .andExpect(status().isForbidden());

    Cookie bareCookie = login("bare@hq.local");
    mockMvc.perform(get("/api/v1/admin/kyc").cookie(bareCookie)).andExpect(status().isForbidden());
    assertThat(bareAgent.getId()).isNotNull();

    Cookie masterCookie = login("ops@hq.local");
    mockMvc
        .perform(post("/api/v1/admin/kyc/" + submissionId + "/approve").cookie(masterCookie))
        .andExpect(status().isOk());
    mockMvc
        .perform(post("/api/v1/admin/kyc/" + submissionId + "/approve").cookie(masterCookie))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("KYC_CONFLICT"));

    mockMvc
        .perform(
            post("/api/v1/admin/kyc/" + submissionId + "/reject")
                .cookie(masterCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"reason\":\"too late\"}"))
        .andExpect(status().isConflict());

    assertThat(tenantSubscriptionRepository.findByTenantId(tenantB.getId())).isEmpty();
  }

  @Test
  void gstinRequiresGstCertificate() throws Exception {
    Tenant tenant = persistPendingTenant("gst-chemist", "Gst Chemist");
    persistOwner(tenant.getId(), "owner@gst.local");
    Cookie cookie = login("owner@gst.local");

    mockMvc
        .perform(
            multipart("/api/v1/tenants/" + tenant.getId() + "/kyc")
                .file(pdf("drugLicense", "license.pdf"))
                .file(pdf("panDocument", "pan.pdf"))
                .param("legalName", "Gst Retail")
                .param("drugLicenseNumber", "DL-9")
                .param("pan", "ABCDE1234F")
                .param("gstin", "29ABCDE1234F1Z5")
                .param("addressLine1", "1 Road")
                .param("city", "Bengaluru")
                .param("state", "KA")
                .param("pincode", "560001")
                .param("contactPhone", "9876543210")
                .cookie(cookie))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("MISSING_EVIDENCE"));

    mockMvc
        .perform(
            multipart("/api/v1/tenants/" + tenant.getId() + "/kyc")
                .file(pdf("drugLicense", "license.pdf"))
                .file(pdf("panDocument", "pan.pdf"))
                .file(pdf("gstCertificate", "gst.pdf"))
                .param("legalName", "Gst Retail")
                .param("drugLicenseNumber", "DL-9")
                .param("pan", "ABCDE1234F")
                .param("gstin", "29ABCDE1234F1Z5")
                .param("addressLine1", "1 Road")
                .param("city", "Bengaluru")
                .param("state", "KA")
                .param("pincode", "560001")
                .param("contactPhone", "9876543210")
                .cookie(cookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.documents.length()").value(3));
  }

  private String submitAndId(UUID tenantId, Cookie cookie) throws Exception {
    MvcResult result =
        mockMvc
            .perform(kycMultipart(tenantId).cookie(cookie))
            .andExpect(status().isOk())
            .andReturn();
    JsonNode data = objectMapper.readTree(result.getResponse().getContentAsString()).path("data");
    return data.path("submissionId").asText();
  }

  private MockMultipartHttpServletRequestBuilder kycMultipart(UUID tenantId) {
    MockMultipartHttpServletRequestBuilder builder =
        multipart("/api/v1/tenants/" + tenantId + "/kyc")
            .file(pdf("drugLicense", "license.pdf"))
            .file(pdf("panDocument", "pan.pdf"));
    builder.param("legalName", "Asha Retail Pvt Ltd");
    builder.param("drugLicenseNumber", "KA-DL-2026-001");
    builder.param("pan", "ABCDE1234F");
    builder.param("addressLine1", "12 MG Road");
    builder.param("city", "Bengaluru");
    builder.param("state", "Karnataka");
    builder.param("pincode", "560001");
    builder.param("contactPhone", "9876543210");
    return builder;
  }

  private static MockMultipartFile pdf(String name, String filename) {
    return new MockMultipartFile(
        name, filename, "application/pdf", "%PDF-1.4 kyc".getBytes(StandardCharsets.UTF_8));
  }

  private Cookie login(String email) throws Exception {
    Cookie cookie =
        mockMvc
            .perform(
                post("/api/v1/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"email\":\"" + email + "\",\"password\":\"" + PASSWORD + "\"}"))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getCookie("nmm_access");
    assertThat(cookie).isNotNull();
    return cookie;
  }

  private Tenant persistPendingTenant(String slug, String name) {
    Tenant tenant = new Tenant();
    tenant.setId(UUID.randomUUID());
    tenant.setName(name);
    tenant.setSlug(slug);
    Instant now = Instant.parse("2026-09-01T00:00:00Z");
    tenant.setStatus(TenantStatus.VERIFICATION_REQUIRED);
    tenant.setEmailVerifiedAt(now);
    tenant.setCreatedAt(now);
    tenant.setUpdatedAt(now);
    return tenantRepository.saveAndFlush(tenant);
  }

  private AppUser persistOwner(UUID tenantId, String email) {
    return persistUser(tenantId, email, AppUserRole.pharmacy_owner, null);
  }

  private AppUser persistUser(UUID tenantId, String email, AppUserRole role, UUID createdBy) {
    Instant now = Instant.parse("2026-09-01T00:00:00Z");
    AppUser user = new AppUser();
    user.setId(UUID.randomUUID());
    user.setTenantId(tenantId);
    user.setEmail(email);
    user.setPasswordHash(passwordEncoder.encode(PASSWORD));
    user.setDisplayName("Test " + email);
    user.setPhone("9000000000");
    user.setRole(role);
    user.setActive(true);
    user.setStatus(UserAccountStatus.ACTIVE);
    user.setCreatedBy(createdBy);
    user.setPasswordChangedAt(now);
    user.setMustChangePassword(false);
    user.setCreatedAt(now);
    user.setUpdatedAt(now);
    return appUserRepository.saveAndFlush(user);
  }

  private void assignVerificationDesk(UUID userId) {
    UserAccessRole assignment = new UserAccessRole();
    assignment.setId(UUID.randomUUID());
    assignment.setUserId(userId);
    assignment.setRoleId(VERIFICATION_AGENT_ROLE);
    assignment.setTenantId(null);
    assignment.setCreatedAt(Instant.parse("2026-09-01T00:00:00Z"));
    userAccessRoleRepository.saveAndFlush(assignment);
  }
}
