package com.nammamedmate.server.feature.impersonation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.AuditEventRepository;
import com.nammamedmate.server.persistence.TenantRepository;
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
class AuthImpersonationTest {

  private static final String PASSWORD = "counter-pass-1";

  @Container
  static final PostgreSQLContainer<?> POSTGRES =
      new PostgreSQLContainer<>("postgres:16-alpine")
          .withDatabaseName("nammamedmate_impersonation")
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
  @Autowired private AuditEventRepository auditEventRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @BeforeEach
  void wipe() {
    auditEventRepository.deleteAll();
    userSessionRepository.deleteAll();
    appUserRepository.deleteAll();
    tenantRepository.deleteAll();
  }

  @Test
  void ac01_masterStartsThenExitsRestoringOriginalSession() throws Exception {
    Tenant tenant = persistTenant("varshmaan-support");
    AppUser master =
        persistUser(
            null, "master@supports.local", AppUserRole.admin_super, UserAccountStatus.ACTIVE);
    AppUser owner =
        persistUser(
            tenant.getId(),
            "owner@supports.local",
            AppUserRole.pharmacy_owner,
            UserAccountStatus.ACTIVE);
    Cookie masterCookie = login("master@supports.local");

    mockMvc
        .perform(get("/api/v1/auth/me").cookie(masterCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.userId").value(master.getId().toString()))
        .andExpect(jsonPath("$.data.impersonation").doesNotExist());

    long sessionsBefore = userSessionRepository.count();
    long auditsBefore = auditEventRepository.count();

    Cookie supportCookie =
        mockMvc
            .perform(
                post("/api/v1/admin/impersonation")
                    .cookie(masterCookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(emailJson("owner@supports.local")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.userId").value(owner.getId().toString()))
            .andExpect(jsonPath("$.data.role").value("pharmacy_owner"))
            .andExpect(jsonPath("$.data.tenantId").value(tenant.getId().toString()))
            .andExpect(
                jsonPath("$.data.impersonation.originalUserId").value(master.getId().toString()))
            .andExpect(jsonPath("$.data.impersonation.originalDisplayName").exists())
            .andExpect(
                jsonPath("$.data.impersonation.effectiveUserId").value(owner.getId().toString()))
            .andExpect(jsonPath("$.data.impersonation.tenantId").value(tenant.getId().toString()))
            .andExpect(jsonPath("$.data.impersonation.tenantName").value(tenant.getName()))
            .andExpect(cookie().exists("nmm_access"))
            .andReturn()
            .getResponse()
            .getCookie("nmm_access");
    assertThat(supportCookie).isNotNull();
    assertThat(supportCookie.getValue()).isNotEqualTo(masterCookie.getValue());
    assertThat(userSessionRepository.count()).isEqualTo(sessionsBefore);
    assertThat(auditEventRepository.count()).isEqualTo(auditsBefore);

    mockMvc
        .perform(get("/api/v1/auth/me").cookie(supportCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.userId").value(owner.getId().toString()))
        .andExpect(jsonPath("$.data.role").value("pharmacy_owner"))
        .andExpect(
            jsonPath("$.data.impersonation.originalUserId").value(master.getId().toString()));

    Cookie restored =
        mockMvc
            .perform(delete("/api/v1/admin/impersonation").cookie(supportCookie))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.userId").value(master.getId().toString()))
            .andExpect(jsonPath("$.data.role").value("admin_super"))
            .andExpect(jsonPath("$.data.impersonation").doesNotExist())
            .andExpect(cookie().exists("nmm_access"))
            .andReturn()
            .getResponse()
            .getCookie("nmm_access");
    assertThat(restored).isNotNull();
    assertThat(userSessionRepository.count()).isEqualTo(sessionsBefore);
    assertThat(auditEventRepository.count()).isEqualTo(auditsBefore);

    mockMvc
        .perform(get("/api/v1/auth/me").cookie(restored))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.userId").value(master.getId().toString()))
        .andExpect(jsonPath("$.data.impersonation").doesNotExist());
  }

  @Test
  void ac01_targetUserSessionsAreNotCreatedOrRevoked() throws Exception {
    Tenant tenant = persistTenant("target-sessions");
    persistUser(null, "master@sess.local", AppUserRole.admin_super, UserAccountStatus.ACTIVE);
    AppUser owner =
        persistUser(
            tenant.getId(),
            "owner@sess.local",
            AppUserRole.pharmacy_owner,
            UserAccountStatus.ACTIVE);
    Cookie ownerCookie = login("owner@sess.local");
    assertThat(userSessionRepository.findAll().stream().filter(s -> s.getRevokedAt() == null))
        .anyMatch(s -> owner.getId().equals(s.getUserId()));

    Cookie masterCookie = login("master@sess.local");
    mockMvc
        .perform(
            post("/api/v1/admin/impersonation")
                .cookie(masterCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(emailJson("owner@sess.local")))
        .andExpect(status().isOk());

    assertThat(
            userSessionRepository.findAll().stream()
                .filter(s -> owner.getId().equals(s.getUserId()) && s.getRevokedAt() == null))
        .hasSize(1);
    mockMvc.perform(get("/api/v1/auth/me").cookie(ownerCookie)).andExpect(status().isOk());
  }

  @Test
  void ac02_meExposesBannerFieldsWhileImpersonating() throws Exception {
    Tenant tenant = persistTenant("banner-tenant");
    AppUser master =
        persistUser(null, "master@banner.local", AppUserRole.admin_super, UserAccountStatus.ACTIVE);
    AppUser staff =
        persistUser(
            tenant.getId(),
            "staff@banner.local",
            AppUserRole.pharmacy_staff,
            UserAccountStatus.ACTIVE);
    Cookie cookie = startImpersonation(login("master@banner.local"), "staff@banner.local");

    mockMvc
        .perform(get("/api/v1/auth/me").cookie(cookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.displayName").value(staff.getDisplayName()))
        .andExpect(jsonPath("$.data.impersonation.tenantName").value(tenant.getName()))
        .andExpect(
            jsonPath("$.data.impersonation.effectiveDisplayName").value(staff.getDisplayName()))
        .andExpect(
            jsonPath("$.data.impersonation.originalDisplayName").value(master.getDisplayName()))
        .andExpect(jsonPath("$.data.impersonation.effectiveRole").value("pharmacy_staff"));
  }

  @Test
  void ac03_nonMasterCannotStart() throws Exception {
    Tenant tenant = persistTenant("deny-owner");
    persistUser(
        tenant.getId(), "owner@deny.local", AppUserRole.pharmacy_owner, UserAccountStatus.ACTIVE);
    persistUser(
        tenant.getId(), "target@deny.local", AppUserRole.pharmacy_staff, UserAccountStatus.ACTIVE);
    Cookie ownerCookie = login("owner@deny.local");
    String before = ownerCookie.getValue();
    long auditsBefore = auditEventRepository.count();

    mockMvc
        .perform(
            post("/api/v1/admin/impersonation")
                .cookie(ownerCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(emailJson("target@deny.local")))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"));

    mockMvc
        .perform(get("/api/v1/auth/me").cookie(ownerCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.impersonation").doesNotExist());
    assertThat(ownerCookie.getValue()).isEqualTo(before);
    assertThat(auditEventRepository.count()).isEqualTo(auditsBefore);
  }

  @Test
  void ac03_verificationAgentCannotStart() throws Exception {
    Tenant tenant = persistTenant("deny-va");
    persistUser(null, "va@deny.local", AppUserRole.admin_verification, UserAccountStatus.ACTIVE);
    persistUser(
        tenant.getId(), "owner@va.local", AppUserRole.pharmacy_owner, UserAccountStatus.ACTIVE);

    mockMvc
        .perform(
            post("/api/v1/admin/impersonation")
                .cookie(login("va@deny.local"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(emailJson("owner@va.local")))
        .andExpect(status().isForbidden());
  }

  @Test
  void ac03_inactiveTargetDeniedWithoutSessionMutation() throws Exception {
    Tenant tenant = persistTenant("inactive-target");
    persistUser(null, "master@inactive.local", AppUserRole.admin_super, UserAccountStatus.ACTIVE);
    persistUser(
        tenant.getId(),
        "locked@inactive.local",
        AppUserRole.pharmacy_owner,
        UserAccountStatus.SUSPENDED);
    Cookie masterCookie = login("master@inactive.local");
    String before = masterCookie.getValue();
    long sessionsBefore = userSessionRepository.count();

    mockMvc
        .perform(
            post("/api/v1/admin/impersonation")
                .cookie(masterCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(emailJson("locked@inactive.local")))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("TARGET_INACTIVE"));

    assertThat(userSessionRepository.count()).isEqualTo(sessionsBefore);
    mockMvc
        .perform(get("/api/v1/auth/me").cookie(masterCookie))
        .andExpect(jsonPath("$.data.impersonation").doesNotExist());
    assertThat(masterCookie.getValue()).isEqualTo(before);
  }

  @Test
  void ac03_missingTargetIsNotFoundWithoutDisclosure() throws Exception {
    persistUser(null, "master@missing.local", AppUserRole.admin_super, UserAccountStatus.ACTIVE);

    mockMvc
        .perform(
            post("/api/v1/admin/impersonation")
                .cookie(login("master@missing.local"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(emailJson("nobody@missing.local")))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));
  }

  @Test
  void ac03_nestedImpersonationDenied() throws Exception {
    Tenant tenant = persistTenant("nested");
    persistUser(null, "master@nested.local", AppUserRole.admin_super, UserAccountStatus.ACTIVE);
    persistUser(
        tenant.getId(), "owner@nested.local", AppUserRole.pharmacy_owner, UserAccountStatus.ACTIVE);
    persistUser(
        tenant.getId(), "staff@nested.local", AppUserRole.pharmacy_staff, UserAccountStatus.ACTIVE);
    Cookie support = startImpersonation(login("master@nested.local"), "owner@nested.local");
    String before = support.getValue();
    long auditsBefore = auditEventRepository.count();

    mockMvc
        .perform(
            post("/api/v1/admin/impersonation")
                .cookie(support)
                .contentType(MediaType.APPLICATION_JSON)
                .content(emailJson("staff@nested.local")))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("ALREADY_IMPERSONATING"));

    assertThat(support.getValue()).isEqualTo(before);
    assertThat(auditEventRepository.count()).isEqualTo(auditsBefore);
  }

  @Test
  void ac03_cannotImpersonateMasterOrPlatformUser() throws Exception {
    persistUser(null, "master@plat.local", AppUserRole.admin_super, UserAccountStatus.ACTIVE);
    persistUser(null, "other@plat.local", AppUserRole.admin_super, UserAccountStatus.ACTIVE);

    mockMvc
        .perform(
            post("/api/v1/admin/impersonation")
                .cookie(login("master@plat.local"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(emailJson("other@plat.local")))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("INVALID_TARGET"));
  }

  @Test
  void ac03_exitWithoutImpersonationIsConflict() throws Exception {
    persistUser(null, "master@exit.local", AppUserRole.admin_super, UserAccountStatus.ACTIVE);

    mockMvc
        .perform(delete("/api/v1/admin/impersonation").cookie(login("master@exit.local")))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("NOT_IMPERSONATING"));
  }

  @Test
  void ac01_blankEmailIsValidationError() throws Exception {
    persistUser(null, "master@val.local", AppUserRole.admin_super, UserAccountStatus.ACTIVE);

    mockMvc
        .perform(
            post("/api/v1/admin/impersonation")
                .cookie(login("master@val.local"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"  \"}"))
        .andExpect(status().isBadRequest());
  }

  @Test
  void d001_startAndExitDoNotWriteAuditEvents() throws Exception {
    Tenant tenant = persistTenant("no-audit");
    persistUser(null, "master@audit.local", AppUserRole.admin_super, UserAccountStatus.ACTIVE);
    persistUser(
        tenant.getId(), "owner@audit.local", AppUserRole.pharmacy_owner, UserAccountStatus.ACTIVE);
    Cookie master = login("master@audit.local");
    auditEventRepository.deleteAll();

    Cookie support =
        mockMvc
            .perform(
                post("/api/v1/admin/impersonation")
                    .cookie(master)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(emailJson("owner@audit.local")))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getCookie("nmm_access");
    assertThat(auditEventRepository.count()).isZero();

    mockMvc
        .perform(delete("/api/v1/admin/impersonation").cookie(support))
        .andExpect(status().isOk());
    assertThat(auditEventRepository.count()).isZero();
  }

  private Cookie startImpersonation(Cookie masterCookie, String email) throws Exception {
    Cookie cookie =
        mockMvc
            .perform(
                post("/api/v1/admin/impersonation")
                    .cookie(masterCookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(emailJson(email)))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getCookie("nmm_access");
    assertThat(cookie).isNotNull();
    return cookie;
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

  private AppUser persistUser(
      UUID tenantId, String email, AppUserRole role, UserAccountStatus status) {
    Instant now = Instant.parse("2026-09-01T00:00:00Z");
    AppUser user = new AppUser();
    user.setId(UUID.randomUUID());
    user.setTenantId(tenantId);
    user.setEmail(email);
    user.setPasswordHash(passwordEncoder.encode(PASSWORD));
    user.setDisplayName("Test " + email);
    user.setRole(role);
    user.setActive(true);
    user.setStatus(status);
    user.setCreatedAt(now);
    user.setUpdatedAt(now);
    return appUserRepository.saveAndFlush(user);
  }

  private static String emailJson(String email) {
    return "{\"email\":\"" + email + "\"}";
  }

  @SuppressWarnings("unused")
  private JsonNode data(String body) throws Exception {
    return objectMapper.readTree(body).path("data");
  }
}
