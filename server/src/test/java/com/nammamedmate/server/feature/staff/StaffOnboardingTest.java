package com.nammamedmate.server.feature.staff;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.StaffRegistration;
import com.nammamedmate.server.domain.StaffRegistrationKind;
import com.nammamedmate.server.domain.StaffRegistrationStatus;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.PasswordHistoryRepository;
import com.nammamedmate.server.persistence.PasswordResetTokenRepository;
import com.nammamedmate.server.persistence.SavedLoginRepository;
import com.nammamedmate.server.persistence.StaffRegistrationRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.persistence.TransactionalEmailRepository;
import com.nammamedmate.server.persistence.UserSessionRepository;
import jakarta.servlet.http.Cookie;
import java.time.Instant;
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
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Testcontainers
class StaffOnboardingTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final String STAFF_PASSWORD = "till-pass-1";

  @Container
  static final PostgreSQLContainer<?> POSTGRES =
      new PostgreSQLContainer<>("postgres:16-alpine")
          .withDatabaseName("nammamedmate_staff")
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
  @Autowired private StaffRegistrationRepository staffRegistrationRepository;
  @Autowired private UserSessionRepository userSessionRepository;
  @Autowired private PasswordHistoryRepository passwordHistoryRepository;
  @Autowired private PasswordResetTokenRepository passwordResetTokenRepository;
  @Autowired private TransactionalEmailRepository transactionalEmailRepository;
  @Autowired private SavedLoginRepository savedLoginRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @BeforeEach
  void wipe() {
    passwordResetTokenRepository.deleteAll();
    passwordHistoryRepository.deleteAll();
    transactionalEmailRepository.deleteAll();
    savedLoginRepository.deleteAll();
    userSessionRepository.deleteAll();
    staffRegistrationRepository.deleteAll();
    appUserRepository.deleteAll();
    tenantRepository.deleteAll();
  }

  @Test
  void ac01_unauthenticatedCreateAndSelfRegisterAreUnavailable() throws Exception {
    mockMvc
        .perform(
            post("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON)
                .content(createJson("staff@self.local", "pharmacy_staff", "STAFF", null)))
        .andExpect(status().isUnauthorized());

    mockMvc
        .perform(
            post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"self@pharma.local\",\"password\":\"counter-pass-1\"}"))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void ac02_ownerCreatesPendingTenantStaffWithoutBranch() throws Exception {
    Tenant tenant = persistTenant("staff-pharma");
    persistUser(tenant.getId(), "owner@staff.local", AppUserRole.pharmacy_owner, null);
    Cookie cookie = login("owner@staff.local");

    mockMvc
        .perform(
            post("/api/v1/users")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(createJson("clerk@staff.local", "pharmacy_staff", "STAFF", null)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data.email").value("clerk@staff.local"))
        .andExpect(jsonPath("$.data.role").value("pharmacy_staff"))
        .andExpect(jsonPath("$.data.status").value("PENDING"))
        .andExpect(jsonPath("$.data.mustChangePassword").value(true))
        .andExpect(jsonPath("$.data.kind").value("STAFF"))
        .andExpect(jsonPath("$.data.branchId").doesNotExist());

    AppUser stored =
        appUserRepository
            .findByNormalizedEmailAndDeletedAtIsNull("clerk@staff.local")
            .orElseThrow();
    assertThat(stored.getStatus()).isEqualTo(UserAccountStatus.PENDING);
    assertThat(stored.isActive()).isFalse();
    assertThat(stored.isMustChangePassword()).isTrue();
    assertThat(stored.getTenantId()).isEqualTo(tenant.getId());
    assertThat(stored.getCreatedBy()).isNotNull();
    StaffRegistration registration =
        staffRegistrationRepository.findByUserId(stored.getId()).orElseThrow();
    assertThat(registration.getTenantId()).isEqualTo(tenant.getId());
    assertThat(registration.getStatus()).isEqualTo(StaffRegistrationStatus.PENDING);

    mockMvc
        .perform(
            post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginJson("clerk@staff.local", STAFF_PASSWORD)))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("ACCOUNT_CANNOT_SIGN_IN"));
  }

  @Test
  void ac02_masterCreatesPendingVerificationAgent() throws Exception {
    persistUser(null, "ops@hq.local", AppUserRole.admin_super, null);
    Cookie cookie = login("ops@hq.local");

    mockMvc
        .perform(
            post("/api/v1/users")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(createJson("agent@hq.local", "admin_verification", "STAFF", null)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.role").value("admin_verification"))
        .andExpect(jsonPath("$.data.status").value("PENDING"));

    AppUser stored =
        appUserRepository.findByNormalizedEmailAndDeletedAtIsNull("agent@hq.local").orElseThrow();
    assertThat(stored.getTenantId()).isNull();
    assertThat(staffRegistrationRepository.findByUserId(stored.getId()).orElseThrow().getTenantId())
        .isNull();
  }

  @Test
  void ac03_masterApprovesPharmacistLicenseAndActivates() throws Exception {
    Tenant tenant = persistTenant("rx-pharma");
    persistUser(tenant.getId(), "owner@rx.local", AppUserRole.pharmacy_owner, null);
    persistUser(null, "ops@hq.local", AppUserRole.admin_super, null);
    Cookie ownerCookie = login("owner@rx.local");

    String body =
        mockMvc
            .perform(
                post("/api/v1/users")
                    .cookie(ownerCookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        createJson("rx@staff.local", "pharmacy_staff", "PHARMACIST", "KA-PCI-99")))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    String registrationId =
        objectMapper.readTree(body).path("data").path("registrationId").asText();

    Cookie masterCookie = login("ops@hq.local");
    mockMvc
        .perform(
            post("/api/v1/admin/staff-verifications/" + registrationId + "/approve")
                .cookie(masterCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"evidenceReference\":\"pci-scan-2026\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("APPROVED"))
        .andExpect(jsonPath("$.data.evidenceReference").value("pci-scan-2026"))
        .andExpect(jsonPath("$.data.reviewedBy").isNotEmpty())
        .andExpect(jsonPath("$.data.reviewedAt").isNotEmpty());

    AppUser pharmacist =
        appUserRepository.findByNormalizedEmailAndDeletedAtIsNull("rx@staff.local").orElseThrow();
    assertThat(pharmacist.getStatus()).isEqualTo(UserAccountStatus.ACTIVE);
    assertThat(pharmacist.isActive()).isTrue();
    StaffRegistration registration =
        staffRegistrationRepository.findByUserId(pharmacist.getId()).orElseThrow();
    assertThat(registration.getStatus()).isEqualTo(StaffRegistrationStatus.APPROVED);
    assertThat(registration.getEvidenceReference()).isEqualTo("pci-scan-2026");
    assertThat(registration.getReviewedBy()).isNotNull();
    assertThat(registration.getReviewedAt()).isNotNull();

    mockMvc
        .perform(
            post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginJson("rx@staff.local", STAFF_PASSWORD)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.mustChangePassword").value(true));
  }

  @Test
  void ac03_verificationAgentCanApproveStaffRegistration() throws Exception {
    Tenant tenant = persistTenant("va-pharma");
    persistUser(tenant.getId(), "owner@va.local", AppUserRole.pharmacy_owner, null);
    AppUser master = persistUser(null, "ops@hq.local", AppUserRole.admin_super, null);
    persistUser(null, "agent@hq.local", AppUserRole.admin_verification, master.getId());
    Cookie ownerCookie = login("owner@va.local");
    String body =
        mockMvc
            .perform(
                post("/api/v1/users")
                    .cookie(ownerCookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(createJson("till@va.local", "pharmacy_staff", "STAFF", null)))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    String registrationId =
        objectMapper.readTree(body).path("data").path("registrationId").asText();

    Cookie agentCookie = login("agent@hq.local");
    mockMvc
        .perform(
            post("/api/v1/admin/staff-verifications/" + registrationId + "/approve")
                .cookie(agentCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"evidenceReference\":\"staff-id-1\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("APPROVED"));
  }

  @Test
  void ac04_deactivateIsSoftDeleteAndDeniesLogin() throws Exception {
    Tenant tenant = persistTenant("offboard-pharma");
    AppUser owner =
        persistUser(tenant.getId(), "owner@off.local", AppUserRole.pharmacy_owner, null);
    AppUser staff =
        persistUser(tenant.getId(), "clerk@off.local", AppUserRole.pharmacy_staff, owner.getId());
    persistRegistration(
        staff, tenant.getId(), StaffRegistrationKind.STAFF, StaffRegistrationStatus.APPROVED);
    Cookie cookie = login("owner@off.local");

    mockMvc
        .perform(post("/api/v1/users/" + staff.getId() + "/deactivate").cookie(cookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("TERMINATED"));

    AppUser stored = appUserRepository.findById(staff.getId()).orElseThrow();
    assertThat(stored.getDeletedAt()).isNotNull();
    assertThat(stored.getStatus()).isEqualTo(UserAccountStatus.TERMINATED);
    assertThat(stored.isActive()).isFalse();

    mockMvc
        .perform(
            post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginJson("clerk@off.local", PASSWORD)))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void ac05_planLimitDuplicateLicensePrivilegeAndCrossTenantFailSafely() throws Exception {
    Tenant tenantA = persistTenant("cap-a");
    Tenant tenantB = persistTenant("cap-b");
    persistUser(tenantA.getId(), "owner-a@cap.local", AppUserRole.pharmacy_owner, null);
    persistUser(tenantA.getId(), "one@cap.local", AppUserRole.pharmacy_staff, null);
    persistUser(tenantA.getId(), "two@cap.local", AppUserRole.pharmacy_staff, null);
    persistUser(tenantB.getId(), "owner-b@cap.local", AppUserRole.pharmacy_owner, null);
    persistUser(null, "ops@hq.local", AppUserRole.admin_super, null);
    Cookie ownerA = login("owner-a@cap.local");

    mockMvc
        .perform(
            post("/api/v1/users")
                .cookie(ownerA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(createJson("three@cap.local", "pharmacy_staff", "STAFF", null)))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("PLAN_LIMIT"));
    assertThat(appUserRepository.findByNormalizedEmailAndDeletedAtIsNull("three@cap.local"))
        .isEmpty();

    Tenant tenantC = persistTenant("dup-c");
    persistUser(tenantC.getId(), "owner-c@dup.local", AppUserRole.pharmacy_owner, null);
    Cookie ownerC = login("owner-c@dup.local");
    mockMvc
        .perform(
            post("/api/v1/users")
                .cookie(ownerC)
                .contentType(MediaType.APPLICATION_JSON)
                .content(createJson("clerk@dup.local", "pharmacy_staff", "STAFF", null)))
        .andExpect(status().isOk());
    String duplicate =
        mockMvc
            .perform(
                post("/api/v1/users")
                    .cookie(ownerC)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(createJson("clerk@dup.local", "pharmacy_staff", "STAFF", null)))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.code").value("EMAIL_TAKEN"))
            .andReturn()
            .getResponse()
            .getContentAsString();
    assertThat(duplicate).doesNotContain("owner-a");

    mockMvc
        .perform(
            post("/api/v1/users")
                .cookie(ownerC)
                .contentType(MediaType.APPLICATION_JSON)
                .content(createJson("rx@dup.local", "pharmacy_staff", "PHARMACIST", "")))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("INVALID_LICENSE"));

    mockMvc
        .perform(
            post("/api/v1/users")
                .cookie(ownerC)
                .contentType(MediaType.APPLICATION_JSON)
                .content(createJson("boss@dup.local", "pharmacy_owner", "STAFF", null)))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("PRIVILEGE_ESCALATION"));

    Cookie ownerB = login("owner-b@cap.local");
    AppUser staffA =
        appUserRepository.findByNormalizedEmailAndDeletedAtIsNull("one@cap.local").orElseThrow();
    String cross =
        mockMvc
            .perform(post("/api/v1/users/" + staffA.getId() + "/deactivate").cookie(ownerB))
            .andExpect(status().isNotFound())
            .andReturn()
            .getResponse()
            .getContentAsString();
    assertThat(cross).doesNotContain("one@cap.local");
  }

  @Test
  void ac05_staffCannotCreateAndOwnerCannotApprove() throws Exception {
    Tenant tenant = persistTenant("deny-pharma");
    AppUser owner =
        persistUser(tenant.getId(), "owner@deny.local", AppUserRole.pharmacy_owner, null);
    persistUser(tenant.getId(), "clerk@deny.local", AppUserRole.pharmacy_staff, owner.getId());
    Cookie staffCookie = login("clerk@deny.local");
    mockMvc
        .perform(
            post("/api/v1/users")
                .cookie(staffCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(createJson("other@deny.local", "pharmacy_staff", "STAFF", null)))
        .andExpect(status().isForbidden());

    Cookie ownerCookie = login("owner@deny.local");
    String body =
        mockMvc
            .perform(
                post("/api/v1/users")
                    .cookie(ownerCookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(createJson("wait@deny.local", "pharmacy_staff", "STAFF", null)))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    String registrationId =
        objectMapper.readTree(body).path("data").path("registrationId").asText();
    mockMvc
        .perform(
            post("/api/v1/admin/staff-verifications/" + registrationId + "/approve")
                .cookie(ownerCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"evidenceReference\":\"nope\"}"))
        .andExpect(status().isForbidden());
  }

  @Test
  void ac05_duplicateApproveConflictsAndInvalidShapeIs400() throws Exception {
    Tenant tenant = persistTenant("twice-pharma");
    persistUser(tenant.getId(), "owner@twice.local", AppUserRole.pharmacy_owner, null);
    persistUser(null, "ops@hq.local", AppUserRole.admin_super, null);
    Cookie ownerCookie = login("owner@twice.local");
    JsonNode created =
        objectMapper.readTree(
            mockMvc
                .perform(
                    post("/api/v1/users")
                        .cookie(ownerCookie)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createJson("once@twice.local", "pharmacy_staff", "STAFF", null)))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString());
    String registrationId = created.path("data").path("registrationId").asText();
    Cookie masterCookie = login("ops@hq.local");
    mockMvc
        .perform(
            post("/api/v1/admin/staff-verifications/" + registrationId + "/approve")
                .cookie(masterCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"evidenceReference\":\"ok-1\"}"))
        .andExpect(status().isOk());
    mockMvc
        .perform(
            post("/api/v1/admin/staff-verifications/" + registrationId + "/approve")
                .cookie(masterCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"evidenceReference\":\"ok-2\"}"))
        .andExpect(status().isConflict());

    mockMvc
        .perform(
            post("/api/v1/users")
                .cookie(ownerCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
        .andExpect(status().isBadRequest());
  }

  @Test
  void persistence_listIsTenantScoped() throws Exception {
    Tenant tenantA = persistTenant("list-a");
    Tenant tenantB = persistTenant("list-b");
    persistUser(tenantA.getId(), "a@list.local", AppUserRole.pharmacy_owner, null);
    persistUser(tenantB.getId(), "b@list.local", AppUserRole.pharmacy_owner, null);
    Cookie cookie = login("a@list.local");
    mockMvc
        .perform(
            post("/api/v1/users")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(createJson("clerk-a@list.local", "pharmacy_staff", "STAFF", null)))
        .andExpect(status().isOk());

    mockMvc
        .perform(get("/api/v1/users").cookie(cookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items.length()").value(2))
        .andExpect(jsonPath("$.data.items[?(@.email=='clerk-a@list.local')]").exists());
  }

  private Cookie login(String email) throws Exception {
    Cookie cookie =
        mockMvc
            .perform(
                post("/api/v1/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(loginJson(email, PASSWORD)))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getCookie("nmm_access");
    assertThat(cookie).isNotNull();
    return cookie;
  }

  private Tenant persistTenant(String slug) {
    Tenant tenant = new Tenant();
    tenant.setId(UUID.randomUUID());
    tenant.setName(slug);
    tenant.setSlug(slug);
    Instant now = Instant.parse("2026-09-01T00:00:00Z");
    tenant.setCreatedAt(now);
    tenant.setUpdatedAt(now);
    return tenantRepository.saveAndFlush(tenant);
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

  private void persistRegistration(
      AppUser user, UUID tenantId, StaffRegistrationKind kind, StaffRegistrationStatus status) {
    StaffRegistration row = new StaffRegistration();
    row.setId(UUID.randomUUID());
    row.setTenantId(tenantId);
    row.setUserId(user.getId());
    row.setKind(kind);
    row.setStatus(status);
    row.setCreatedAt(Instant.parse("2026-09-01T00:00:00Z"));
    staffRegistrationRepository.saveAndFlush(row);
  }

  private static String loginJson(String email, String password) {
    return "{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}";
  }

  private static String createJson(String email, String role, String kind, String licenseNumber) {
    String license = licenseNumber == null ? "" : ",\"licenseNumber\":\"" + licenseNumber + "\"";
    return "{\"displayName\":\"Asha\",\"phone\":\"9876543210\",\"email\":\""
        + email
        + "\",\"password\":\""
        + STAFF_PASSWORD
        + "\",\"role\":\""
        + role
        + "\",\"kind\":\""
        + kind
        + "\""
        + license
        + "}";
  }
}
