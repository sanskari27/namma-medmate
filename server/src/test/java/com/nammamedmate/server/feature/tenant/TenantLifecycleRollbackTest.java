package com.nammamedmate.server.feature.tenant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TenantStatus;
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
class TenantLifecycleRollbackTest {

  private static final String PASSWORD = "counter-pass-1";

  @Container
  static final PostgreSQLContainer<?> POSTGRES =
      new PostgreSQLContainer<>("postgres:16-alpine")
          .withDatabaseName("nammamedmate_tenant_lifecycle_rollback")
          .withUsername("postgres")
          .withPassword("postgres");

  @DynamicPropertySource
  static void datasource(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
    registry.add("spring.datasource.username", POSTGRES::getUsername);
    registry.add("spring.datasource.password", POSTGRES::getPassword);
  }

  @Autowired private MockMvc mockMvc;
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
  void ac05_invalidTransitionLeavesStatusAndAuditUnchanged() throws Exception {
    Tenant tenant = persistTenant("roll-life", "Roll Life", TenantStatus.ACTIVE);
    persistUser(null, "ops@hq.local", AppUserRole.admin_super);
    Cookie masterCookie = login("ops@hq.local");

    mockMvc
        .perform(
            post("/api/v1/admin/tenants/" + tenant.getId() + "/status")
                .cookie(masterCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"status\":\"VERIFICATION_REQUIRED\",\"expectedStatus\":\"ACTIVE\",\"reason\":\"Illegal\"}"))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("INVALID_TRANSITION"));

    assertThat(tenantRepository.findById(tenant.getId()).orElseThrow().getStatus())
        .isEqualTo(TenantStatus.ACTIVE);
    assertThat(tenantRepository.findById(tenant.getId()).orElseThrow().getDeletedAt()).isNull();
    assertThat(
            auditEventRepository.findAll().stream()
                .filter(event -> "TENANT_STATUS_CHANGE".equals(event.getAction())))
        .isEmpty();
  }

  @Test
  void ac05_blankReasonLeavesNoAuditOrStatusChange() throws Exception {
    Tenant tenant = persistTenant("blank-life", "Blank Life", TenantStatus.ACTIVE);
    persistUser(null, "ops@hq.local", AppUserRole.admin_super);
    Cookie masterCookie = login("ops@hq.local");

    mockMvc
        .perform(
            post("/api/v1/admin/tenants/" + tenant.getId() + "/status")
                .cookie(masterCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"status\":\"SUSPENDED\",\"expectedStatus\":\"ACTIVE\",\"reason\":\"\"}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

    assertThat(tenantRepository.findById(tenant.getId()).orElseThrow().getStatus())
        .isEqualTo(TenantStatus.ACTIVE);
    assertThat(
            auditEventRepository.findAll().stream()
                .filter(event -> "TENANT_STATUS_CHANGE".equals(event.getAction())))
        .isEmpty();
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

  private Tenant persistTenant(String slug, String name, TenantStatus status) {
    Tenant tenant = new Tenant();
    tenant.setId(UUID.randomUUID());
    tenant.setName(name);
    tenant.setSlug(slug);
    Instant now = Instant.parse("2026-09-01T00:00:00Z");
    tenant.setStatus(status);
    tenant.setEmailVerifiedAt(now);
    tenant.setCreatedAt(now);
    tenant.setUpdatedAt(now);
    return tenantRepository.saveAndFlush(tenant);
  }

  private AppUser persistUser(UUID tenantId, String email, AppUserRole role) {
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
    user.setPasswordChangedAt(now);
    user.setMustChangePassword(false);
    user.setCreatedAt(now);
    user.setUpdatedAt(now);
    return appUserRepository.saveAndFlush(user);
  }
}
