package com.nammamedmate.server.feature.tenant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.nammamedmate.server.AbstractIntegrationTest;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.AuditEvent;
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
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

class TenantLifecycleTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";

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
  void ac01_legalTransitionsPersistAndIllegalRejected() throws Exception {
    Tenant tenant = persistTenant("life-chemist", "Life Chemist", TenantStatus.ACTIVE);
    persistOwner(tenant.getId(), "owner@life.local");
    AppUser master = persistUser(null, "ops@hq.local", AppUserRole.admin_super);
    Cookie masterCookie = login("ops@hq.local");

    mockMvc
        .perform(
            post("/api/v1/admin/tenants/" + tenant.getId() + "/status")
                .cookie(masterCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(statusBody("SUSPENDED", "ACTIVE", "Payment overdue")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("SUSPENDED"));
    assertThat(tenantRepository.findById(tenant.getId()).orElseThrow().getStatus())
        .isEqualTo(TenantStatus.SUSPENDED);

    mockMvc
        .perform(
            post("/api/v1/admin/tenants/" + tenant.getId() + "/status")
                .cookie(masterCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(statusBody("EXPIRED", "SUSPENDED", "Cannot expire from suspended")))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("INVALID_TRANSITION"));
    assertThat(tenantRepository.findById(tenant.getId()).orElseThrow().getStatus())
        .isEqualTo(TenantStatus.SUSPENDED);

    Tenant verification =
        persistTenant("verify-chemist", "Verify Chemist", TenantStatus.VERIFICATION_REQUIRED);
    mockMvc
        .perform(
            post("/api/v1/admin/tenants/" + verification.getId() + "/status")
                .cookie(masterCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(statusBody("ACTIVE", "VERIFICATION_REQUIRED", "Skip KYC")))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("INVALID_TRANSITION"));
    assertThat(tenantRepository.findById(verification.getId()).orElseThrow().getStatus())
        .isEqualTo(TenantStatus.VERIFICATION_REQUIRED);

    Tenant terminated = persistTenant("gone-chemist", "Gone Chemist", TenantStatus.TERMINATED);
    mockMvc
        .perform(
            post("/api/v1/admin/tenants/" + terminated.getId() + "/status")
                .cookie(masterCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(statusBody("ACTIVE", "TERMINATED", "Revive")))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("INVALID_TRANSITION"));
    assertThat(tenantRepository.findById(terminated.getId()).orElseThrow().getStatus())
        .isEqualTo(TenantStatus.TERMINATED);
    assertThat(master.getId()).isNotNull();
  }

  @Test
  void ac02_masterSuspendTerminateAuditsAndOwnerDenied() throws Exception {
    Tenant tenant = persistTenant("audit-chemist", "Audit Chemist", TenantStatus.ACTIVE);
    AppUser owner = persistOwner(tenant.getId(), "owner@audit.local");
    AppUser master = persistUser(null, "ops@hq.local", AppUserRole.admin_super);
    Cookie ownerCookie = login("owner@audit.local");
    Cookie masterCookie = login("ops@hq.local");

    mockMvc
        .perform(
            post("/api/v1/admin/tenants/" + tenant.getId() + "/status")
                .cookie(ownerCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(statusBody("SUSPENDED", "ACTIVE", "Owner attempt")))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    assertThat(tenantRepository.findById(tenant.getId()).orElseThrow().getStatus())
        .isEqualTo(TenantStatus.ACTIVE);
    assertThat(statusChangeAudits()).isEmpty();

    mockMvc
        .perform(
            post("/api/v1/admin/tenants/" + tenant.getId() + "/status")
                .cookie(masterCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(statusBody("SUSPENDED", "ACTIVE", "Payment overdue")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("SUSPENDED"));

    assertThat(statusChangeAudits())
        .hasSize(1)
        .first()
        .satisfies(
            event -> {
              assertThat(event.getAction()).isEqualTo("TENANT_STATUS_CHANGE");
              assertThat(event.getUserId()).isEqualTo(master.getId());
              assertThat(event.getTenantId()).isEqualTo(tenant.getId());
              assertThat(event.getContextJson()).contains("\"from\":\"ACTIVE\"");
              assertThat(event.getContextJson()).contains("\"to\":\"SUSPENDED\"");
              assertThat(event.getContextJson()).contains("\"reason\":\"Payment overdue\"");
            });

    mockMvc
        .perform(
            post("/api/v1/admin/tenants/" + tenant.getId() + "/status")
                .cookie(masterCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(statusBody("TERMINATED", "SUSPENDED", "Contract ended")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("TERMINATED"));

    assertThat(statusChangeAudits()).hasSize(2);
    assertThat(owner.getId()).isNotNull();
  }

  @Test
  void ac03_lockedStatusesBlockProtectedRoutesKeepMeAndRow() throws Exception {
    Tenant tenant = persistTenant("lock-chemist", "Lock Chemist", TenantStatus.ACTIVE);
    persistOwner(tenant.getId(), "owner@lock.local");
    persistUser(null, "ops@hq.local", AppUserRole.admin_super);
    Cookie ownerCookie = login("owner@lock.local");
    Cookie masterCookie = login("ops@hq.local");

    mockMvc
        .perform(
            post("/api/v1/admin/tenants/" + tenant.getId() + "/status")
                .cookie(masterCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(statusBody("SUSPENDED", "ACTIVE", "Ops hold")))
        .andExpect(status().isOk());

    mockMvc
        .perform(get("/api/v1/notifications").cookie(ownerCookie))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("TENANT_LOCKED"))
        .andExpect(jsonPath("$.message").value("This pharmacy is suspended."));

    mockMvc
        .perform(get("/api/v1/auth/me").cookie(ownerCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.displayName").value("Test owner@lock.local"))
        .andExpect(jsonPath("$.data.tenantStatus").value("SUSPENDED"));

    mockMvc
        .perform(get("/api/v1/tenants/" + tenant.getId() + "/kyc").cookie(ownerCookie))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("TENANT_LOCKED"));

    Tenant row = tenantRepository.findById(tenant.getId()).orElseThrow();
    assertThat(row.getDeletedAt()).isNull();
    assertThat(row.getStatus()).isEqualTo(TenantStatus.SUSPENDED);

    row.setStatus(TenantStatus.EXPIRED);
    tenantRepository.saveAndFlush(row);
    mockMvc
        .perform(get("/api/v1/notifications").cookie(ownerCookie))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("TENANT_LOCKED"))
        .andExpect(jsonPath("$.message").value("This pharmacy subscription has expired."));

    row.setStatus(TenantStatus.TERMINATED);
    tenantRepository.saveAndFlush(row);
    mockMvc
        .perform(get("/api/v1/notifications").cookie(ownerCookie))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("TENANT_LOCKED"))
        .andExpect(jsonPath("$.message").value("This pharmacy has been terminated."));
    assertThat(tenantRepository.findById(tenant.getId()).orElseThrow().getDeletedAt()).isNull();
  }

  @Test
  void ac04_reactivateSuspendedPreservesUsersAndAccess() throws Exception {
    Tenant tenant = persistTenant("react-chemist", "React Chemist", TenantStatus.ACTIVE);
    AppUser owner = persistOwner(tenant.getId(), "owner@react.local");
    persistUser(null, "ops@hq.local", AppUserRole.admin_super);
    Cookie ownerCookie = login("owner@react.local");
    Cookie masterCookie = login("ops@hq.local");

    mockMvc
        .perform(
            post("/api/v1/admin/tenants/" + tenant.getId() + "/status")
                .cookie(masterCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(statusBody("SUSPENDED", "ACTIVE", "Hold")))
        .andExpect(status().isOk());

    mockMvc
        .perform(get("/api/v1/notifications").cookie(ownerCookie))
        .andExpect(status().isForbidden());

    mockMvc
        .perform(
            post("/api/v1/admin/tenants/" + tenant.getId() + "/status")
                .cookie(masterCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(statusBody("ACTIVE", "SUSPENDED", "Cleared")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("ACTIVE"));

    mockMvc.perform(get("/api/v1/notifications").cookie(ownerCookie)).andExpect(status().isOk());

    assertThat(appUserRepository.findById(owner.getId())).isPresent();
    assertThat(appUserRepository.findById(owner.getId()).orElseThrow().getDeletedAt()).isNull();
    assertThat(tenantRepository.findById(tenant.getId()).orElseThrow().getStatus())
        .isEqualTo(TenantStatus.ACTIVE);
  }

  @Test
  void ac05_staleBlankVaDeniedWithoutPartialWrite() throws Exception {
    Tenant tenant = persistTenant("safe-chemist", "Safe Chemist", TenantStatus.ACTIVE);
    persistOwner(tenant.getId(), "owner@safe.local");
    persistUser(null, "ops@hq.local", AppUserRole.admin_super);
    persistUser(null, "va@hq.local", AppUserRole.admin_verification);
    Cookie masterCookie = login("ops@hq.local");
    Cookie vaCookie = login("va@hq.local");

    mockMvc
        .perform(
            post("/api/v1/admin/tenants/" + tenant.getId() + "/status")
                .cookie(masterCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(statusBody("SUSPENDED", "EXPIRED", "Stale expected")))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("STALE_STATE"));
    assertThat(tenantRepository.findById(tenant.getId()).orElseThrow().getStatus())
        .isEqualTo(TenantStatus.ACTIVE);
    assertThat(statusChangeAudits()).isEmpty();

    mockMvc
        .perform(
            post("/api/v1/admin/tenants/" + tenant.getId() + "/status")
                .cookie(masterCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(statusBody("SUSPENDED", "ACTIVE", "   ")))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    assertThat(tenantRepository.findById(tenant.getId()).orElseThrow().getStatus())
        .isEqualTo(TenantStatus.ACTIVE);

    mockMvc
        .perform(
            post("/api/v1/admin/tenants/" + tenant.getId() + "/status")
                .cookie(vaCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(statusBody("SUSPENDED", "ACTIVE", "VA attempt")))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    assertThat(tenantRepository.findById(tenant.getId()).orElseThrow().getStatus())
        .isEqualTo(TenantStatus.ACTIVE);
    assertThat(statusChangeAudits()).isEmpty();
  }

  private java.util.List<AuditEvent> statusChangeAudits() {
    return auditEventRepository.findAll().stream()
        .filter(event -> "TENANT_STATUS_CHANGE".equals(event.getAction()))
        .toList();
  }

  @Test
  void masterCanListTenantsWithStatus() throws Exception {
    persistTenant("zeta-shop", "Zeta Shop", TenantStatus.ACTIVE);
    persistTenant("alpha-shop", "Alpha Shop", TenantStatus.SUSPENDED);
    persistUser(null, "ops@hq.local", AppUserRole.admin_super);
    persistOwner(
        persistTenant("owner-only", "Owner Only", TenantStatus.ACTIVE).getId(), "owner@list.local");
    Cookie masterCookie = login("ops@hq.local");
    Cookie ownerCookie = login("owner@list.local");

    mockMvc
        .perform(get("/api/v1/admin/tenants").cookie(masterCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items.length()").value(3))
        .andExpect(jsonPath("$.data.items[0].name").value("Alpha Shop"))
        .andExpect(jsonPath("$.data.items[0].status").value("SUSPENDED"))
        .andExpect(jsonPath("$.data.items[0].slug").value("alpha-shop"))
        .andExpect(jsonPath("$.data.items[0].updatedAt").exists())
        .andExpect(jsonPath("$.data.items[0].allowedTransitions").isArray());

    mockMvc
        .perform(get("/api/v1/admin/tenants").cookie(ownerCookie))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"));
  }

  private static String statusBody(String status, String expectedStatus, String reason) {
    return "{\"status\":\""
        + status
        + "\",\"expectedStatus\":\""
        + expectedStatus
        + "\",\"reason\":\""
        + reason
        + "\"}";
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

  private AppUser persistOwner(UUID tenantId, String email) {
    return persistUser(tenantId, email, AppUserRole.pharmacy_owner);
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
