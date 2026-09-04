package com.nammamedmate.server.feature.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nammamedmate.server.AbstractIntegrationTest;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.domain.UserSession;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.persistence.UserSessionRepository;
import jakarta.servlet.http.Cookie;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

class AuthLoginTest extends AbstractIntegrationTest {

  private static final String GENERIC_DENIAL = "Invalid email or password";
  private static final String ACCOUNT_LOCKED = "This account cannot sign in.";
  private static final String PASSWORD = "counter-pass-1";

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private UserSessionRepository userSessionRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @BeforeEach
  void wipeAuthTables() {
    userSessionRepository.deleteAll();
    appUserRepository.deleteAll();
    tenantRepository.deleteAll();
  }

  @Test
  void ac01_loginSucceedsWhenEmailCaseDiffersFromStoredNormalizedValue() throws Exception {
    Tenant tenant = persistTenant("case-pharma");
    AppUser owner =
        persistUser(
            tenant.getId(),
            "owner@case.local",
            AppUserRole.pharmacy_owner,
            UserAccountStatus.ACTIVE,
            null);

    mockMvc
        .perform(
            post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginJson("  OWNER@Case.Local ", PASSWORD)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data.userId").value(owner.getId().toString()))
        .andExpect(jsonPath("$.data.displayName").value(owner.getDisplayName()))
        .andExpect(jsonPath("$.data.role").value("pharmacy_owner"))
        .andExpect(jsonPath("$.data.tenantId").value(tenant.getId().toString()))
        .andExpect(cookie().exists("nmm_access"))
        .andExpect(cookie().httpOnly("nmm_access", true));
  }

  @Test
  void ac01_emailUniquenessRejectsCaseVariantInsert() {
    persistUser(null, "master@hq.local", AppUserRole.admin_super, UserAccountStatus.ACTIVE, null);

    AppUser duplicate = newUser(null, "MASTER@hq.local", AppUserRole.admin_super);
    org.assertj.core.api.Assertions.assertThatThrownBy(
            () -> appUserRepository.saveAndFlush(duplicate))
        .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
  }

  @Test
  void ac02_passwordIsVerifiedAgainstBcryptHashNotPlaintext() throws Exception {
    persistUser(null, "hash@hq.local", AppUserRole.admin_super, UserAccountStatus.ACTIVE, null);
    AppUser stored = appUserRepository.findByEmailAndDeletedAtIsNull("hash@hq.local").orElseThrow();
    assertThat(stored.getPasswordHash()).isNotEqualTo(PASSWORD);
    assertThat(stored.getPasswordHash()).startsWith("$2");
    assertThat(passwordEncoder.matches(PASSWORD, stored.getPasswordHash())).isTrue();

    mockMvc
        .perform(
            post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginJson("hash@hq.local", PASSWORD)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true));
  }

  @Test
  void ac03_successfulLoginRevokesPriorSessionCookie() throws Exception {
    persistUser(null, "once@hq.local", AppUserRole.admin_super, UserAccountStatus.ACTIVE, null);

    Cookie first =
        mockMvc
            .perform(
                post("/api/v1/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(loginJson("once@hq.local", PASSWORD)))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getCookie("nmm_access");
    assertThat(first).isNotNull();

    mockMvc
        .perform(get("/api/v1/auth/me").cookie(first))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.displayName").exists());

    Cookie second =
        mockMvc
            .perform(
                post("/api/v1/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(loginJson("once@hq.local", PASSWORD)))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getCookie("nmm_access");
    assertThat(second).isNotNull();
    assertThat(second.getValue()).isNotEqualTo(first.getValue());

    mockMvc.perform(get("/api/v1/auth/me").cookie(first)).andExpect(status().isUnauthorized());
    mockMvc
        .perform(get("/api/v1/auth/me").cookie(second))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true));

    assertThat(userSessionRepository.findAll().stream().filter(s -> s.getRevokedAt() == null))
        .hasSize(1);
  }

  @Test
  void ac03_databaseAllowsOnlyOneUnrevokedSessionPerUser() {
    AppUser user =
        persistUser(null, "once@hq.local", AppUserRole.admin_super, UserAccountStatus.ACTIVE, null);
    Instant now = Instant.parse("2026-09-02T00:00:00Z");
    userSessionRepository.saveAndFlush(newSession(user.getId(), now));

    org.assertj.core.api.Assertions.assertThatThrownBy(
            () -> userSessionRepository.saveAndFlush(newSession(user.getId(), now.plusSeconds(1))))
        .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
  }

  @Test
  void ac03_overlappingLoginsLeaveExactlyOneActiveSession() throws Exception {
    persistUser(null, "overlap@hq.local", AppUserRole.admin_super, UserAccountStatus.ACTIVE, null);

    int workers = 8;
    ExecutorService pool = Executors.newFixedThreadPool(workers);
    CountDownLatch start = new CountDownLatch(1);
    List<Future<Integer>> results = new ArrayList<>();
    try {
      for (int i = 0; i < workers; i++) {
        results.add(
            pool.submit(
                () -> {
                  start.await();
                  return mockMvc
                      .perform(
                          post("/api/v1/auth/login")
                              .contentType(MediaType.APPLICATION_JSON)
                              .content(loginJson("overlap@hq.local", PASSWORD)))
                      .andReturn()
                      .getResponse()
                      .getStatus();
                }));
      }
      start.countDown();
      for (Future<Integer> result : results) {
        assertThat(result.get(15, TimeUnit.SECONDS)).isEqualTo(200);
      }
    } finally {
      pool.shutdownNow();
    }

    assertThat(userSessionRepository.findAll().stream().filter(s -> s.getRevokedAt() == null))
        .hasSize(1);
  }

  @Test
  void ac04_suspendedExpiredTerminatedKycLockedCannotEnter() throws Exception {
    assertBlocked(UserAccountStatus.SUSPENDED, "suspended@hq.local");
    assertBlocked(UserAccountStatus.EXPIRED, "expired@hq.local");
    assertBlocked(UserAccountStatus.TERMINATED, "terminated@hq.local");
    assertBlocked(UserAccountStatus.KYC_LOCKED, "kyc@hq.local");
  }

  @Test
  void ac04_deletedAccountCannotEnterAndLooksUnknown() throws Exception {
    persistUser(
        null,
        "gone@hq.local",
        AppUserRole.admin_super,
        UserAccountStatus.ACTIVE,
        Instant.parse("2026-01-01T00:00:00Z"));

    MvcResult deleted =
        mockMvc
            .perform(
                post("/api/v1/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(loginJson("gone@hq.local", PASSWORD)))
            .andExpect(status().isUnauthorized())
            .andReturn();
    MvcResult unknown =
        mockMvc
            .perform(
                post("/api/v1/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(loginJson("missing@hq.local", PASSWORD)))
            .andExpect(status().isUnauthorized())
            .andReturn();
    assertSameDenial(deleted, unknown);
  }

  @Test
  void ac05_otpSocialSsoAnd2faRoutesAreAbsent() throws Exception {
    mockMvc.perform(post("/api/v1/auth/otp")).andExpect(status().isUnauthorized());
    mockMvc.perform(post("/api/v1/auth/sso")).andExpect(status().isUnauthorized());
    mockMvc.perform(post("/api/v1/auth/2fa")).andExpect(status().isUnauthorized());
    mockMvc.perform(get("/api/v1/auth/otp")).andExpect(status().isUnauthorized());
  }

  @Test
  void ac06_failedLoginsDoNotLockAccount() throws Exception {
    persistUser(null, "retry@hq.local", AppUserRole.admin_super, UserAccountStatus.ACTIVE, null);

    for (int i = 0; i < 10; i++) {
      mockMvc
          .perform(
              post("/api/v1/auth/login")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(loginJson("retry@hq.local", "wrong-password")))
          .andExpect(status().isUnauthorized())
          .andExpect(jsonPath("$.message").value(GENERIC_DENIAL));
    }

    mockMvc
        .perform(
            post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginJson("retry@hq.local", PASSWORD)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true));

    AppUser stored =
        appUserRepository.findByEmailAndDeletedAtIsNull("retry@hq.local").orElseThrow();
    assertThat(stored.getStatus()).isEqualTo(UserAccountStatus.ACTIVE);
  }

  @Test
  void ac07_unknownUserAndWrongPasswordShareGenericDenial() throws Exception {
    persistUser(null, "real@hq.local", AppUserRole.admin_super, UserAccountStatus.ACTIVE, null);

    MvcResult unknown =
        mockMvc
            .perform(
                post("/api/v1/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(loginJson("nobody@hq.local", PASSWORD)))
            .andExpect(status().isUnauthorized())
            .andReturn();
    MvcResult wrong =
        mockMvc
            .perform(
                post("/api/v1/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(loginJson("real@hq.local", "nope")))
            .andExpect(status().isUnauthorized())
            .andReturn();
    assertSameDenial(unknown, wrong);
    assertThat(wrong.getResponse().getContentAsString()).doesNotContain("real@hq.local");
  }

  @Test
  void ac07_invalidShapeReturns400() throws Exception {
    mockMvc
        .perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON).content("{}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.success").value(false));
    mockMvc
        .perform(
            post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"\",\"password\":\"\"}"))
        .andExpect(status().isBadRequest());
  }

  @Test
  void ac07_wrongPasswordOnSuspendedAccountDoesNotRevealLock() throws Exception {
    persistUser(null, "quiet@hq.local", AppUserRole.admin_super, UserAccountStatus.SUSPENDED, null);

    mockMvc
        .perform(
            post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginJson("quiet@hq.local", "wrong")))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.message").value(GENERIC_DENIAL));
  }

  @Test
  void persistence_pharmacySessionIncludesTenantIdMasterSessionDoesNot() throws Exception {
    Tenant tenant = persistTenant("session-pharma");
    persistUser(
        tenant.getId(),
        "staff@session.local",
        AppUserRole.pharmacy_staff,
        UserAccountStatus.ACTIVE,
        null);
    persistUser(null, "ops@hq.local", AppUserRole.admin_super, UserAccountStatus.ACTIVE, null);

    mockMvc
        .perform(
            post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginJson("staff@session.local", PASSWORD)))
        .andExpect(status().isOk());
    mockMvc
        .perform(
            post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginJson("ops@hq.local", PASSWORD)))
        .andExpect(status().isOk());

    UserSession pharmacy =
        userSessionRepository.findAll().stream()
            .filter(s -> tenant.getId().equals(s.getTenantId()))
            .findFirst()
            .orElseThrow();
    UserSession master =
        userSessionRepository.findAll().stream()
            .filter(s -> s.getTenantId() == null)
            .findFirst()
            .orElseThrow();
    assertThat(pharmacy.getTenantId()).isEqualTo(tenant.getId());
    assertThat(master.getTenantId()).isNull();
  }

  @Test
  void isolation_sessionFromOtherTenantIsRejected() throws Exception {
    Tenant tenantA = persistTenant("iso-a");
    Tenant tenantB = persistTenant("iso-b");
    persistUser(
        tenantA.getId(), "a@iso.local", AppUserRole.pharmacy_owner, UserAccountStatus.ACTIVE, null);
    persistUser(
        tenantB.getId(), "b@iso.local", AppUserRole.pharmacy_owner, UserAccountStatus.ACTIVE, null);

    Cookie cookieA =
        mockMvc
            .perform(
                post("/api/v1/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(loginJson("a@iso.local", PASSWORD)))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getCookie("nmm_access");
    assertThat(cookieA).isNotNull();

    UserSession sessionA =
        userSessionRepository.findAll().stream()
            .filter(s -> tenantA.getId().equals(s.getTenantId()))
            .findFirst()
            .orElseThrow();
    sessionA.setTenantId(tenantB.getId());
    userSessionRepository.saveAndFlush(sessionA);

    mockMvc.perform(get("/api/v1/auth/me").cookie(cookieA)).andExpect(status().isUnauthorized());
  }

  @Test
  void responseDoesNotIncludePasswordHashOrToken() throws Exception {
    persistUser(null, "noleak@hq.local", AppUserRole.admin_super, UserAccountStatus.ACTIVE, null);

    String body =
        mockMvc
            .perform(
                post("/api/v1/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(loginJson("noleak@hq.local", PASSWORD)))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    assertThat(body).doesNotContain(PASSWORD);
    JsonNode data = objectMapper.readTree(body).path("data");
    assertThat(data.has("token")).isFalse();
    assertThat(data.has("passwordHash")).isFalse();
  }

  private void assertBlocked(UserAccountStatus status, String email) throws Exception {
    persistUser(null, email, AppUserRole.admin_super, status, null);
    mockMvc
        .perform(
            post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginJson(email, PASSWORD)))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.success").value(false))
        .andExpect(jsonPath("$.message").value(ACCOUNT_LOCKED));
  }

  private void assertSameDenial(MvcResult left, MvcResult right) throws Exception {
    JsonNode a = objectMapper.readTree(left.getResponse().getContentAsString());
    JsonNode b = objectMapper.readTree(right.getResponse().getContentAsString());
    assertThat(a.path("success").asBoolean()).isFalse();
    assertThat(a.path("message").asText()).isEqualTo(GENERIC_DENIAL);
    assertThat(a.path("code").asText()).isEqualTo(b.path("code").asText());
    assertThat(a.path("message").asText()).isEqualTo(b.path("message").asText());
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
      UUID tenantId, String email, AppUserRole role, UserAccountStatus status, Instant deletedAt) {
    AppUser user = newUser(tenantId, email, role);
    user.setStatus(status);
    user.setDeletedAt(deletedAt);
    return appUserRepository.saveAndFlush(user);
  }

  private AppUser newUser(UUID tenantId, String email, AppUserRole role) {
    Instant now = Instant.parse("2026-09-01T00:00:00Z");
    AppUser user = new AppUser();
    user.setId(UUID.randomUUID());
    user.setTenantId(tenantId);
    user.setEmail(email);
    user.setPasswordHash(passwordEncoder.encode(PASSWORD));
    user.setDisplayName("Test " + email);
    user.setRole(role);
    user.setActive(true);
    user.setStatus(UserAccountStatus.ACTIVE);
    user.setCreatedAt(now);
    user.setUpdatedAt(now);
    return user;
  }

  private static UserSession newSession(UUID userId, Instant now) {
    UserSession session = new UserSession();
    session.setId(UUID.randomUUID());
    session.setUserId(userId);
    session.setExpiresAt(now.plusSeconds(3600));
    session.setCreatedAt(now);
    return session;
  }

  private static String loginJson(String email, String password) {
    return "{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}";
  }
}
