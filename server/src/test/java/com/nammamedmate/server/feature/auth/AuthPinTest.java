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
import com.nammamedmate.server.infrastructure.security.JwtService;
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

class AuthPinTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final String PIN = "123456";
  private static final String OTHER_PIN = "654321";

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private UserSessionRepository userSessionRepository;
  @Autowired private PasswordEncoder passwordEncoder;
  @Autowired private JwtService jwtService;

  @BeforeEach
  void wipeAuthTables() {
    userSessionRepository.deleteAll();
    appUserRepository.deleteAll();
    tenantRepository.deleteAll();
  }

  @Test
  void ac01_settingAndUnlockingPinDoesNotEndTheServerSession() throws Exception {
    persistUser(null, "ops@hq.local", AppUserRole.admin_super);
    Cookie cookie = login("ops@hq.local");

    mockMvc
        .perform(get("/api/v1/auth/me").cookie(cookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.pinSet").value(false));

    mockMvc
        .perform(
            post("/api/v1/auth/pin")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(pinJson(PIN)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.pinSet").value(true))
        .andExpect(cookie().doesNotExist("nmm_access"));

    mockMvc
        .perform(get("/api/v1/auth/me").cookie(cookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.pinSet").value(true));

    Cookie refreshed =
        mockMvc
            .perform(
                post("/api/v1/auth/pin/unlock")
                    .cookie(cookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(pinJson(PIN)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.userId").exists())
            .andExpect(cookie().exists("nmm_access"))
            .andReturn()
            .getResponse()
            .getCookie("nmm_access");
    assertThat(refreshed).isNotNull();

    mockMvc.perform(get("/api/v1/auth/me").cookie(refreshed)).andExpect(status().isOk());
    assertThat(activeSessions()).hasSize(1);
  }

  @Test
  void ac02_pinIsPerUserAndWorksOnALaterSession() throws Exception {
    persistUser(null, "ops@hq.local", AppUserRole.admin_super);
    Cookie first = login("ops@hq.local");
    mockMvc
        .perform(
            post("/api/v1/auth/pin")
                .cookie(first)
                .contentType(MediaType.APPLICATION_JSON)
                .content(pinJson(PIN)))
        .andExpect(status().isOk());

    AppUser stored = appUserRepository.findByEmailAndDeletedAtIsNull("ops@hq.local").orElseThrow();
    assertThat(stored.getPinHash()).isNotEqualTo(PIN);
    assertThat(stored.getPinHash()).startsWith("$2");
    assertThat(passwordEncoder.matches(PIN, stored.getPinHash())).isTrue();

    Cookie second = login("ops@hq.local");
    assertThat(second.getValue()).isNotEqualTo(first.getValue());
    mockMvc.perform(get("/api/v1/auth/me").cookie(first)).andExpect(status().isUnauthorized());

    mockMvc
        .perform(
            post("/api/v1/auth/pin/unlock")
                .cookie(second)
                .contentType(MediaType.APPLICATION_JSON)
                .content(pinJson(PIN)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.pinSet").value(true));
  }

  @Test
  void ac02_pharmacyPinStaysOnTheTenantUser() throws Exception {
    Tenant tenant = persistTenant("pin-pharma");
    persistUser(tenant.getId(), "owner@pin.local", AppUserRole.pharmacy_owner);
    Cookie cookie = login("owner@pin.local");

    mockMvc
        .perform(
            post("/api/v1/auth/pin")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(pinJson(PIN)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.tenantId").value(tenant.getId().toString()));

    AppUser stored =
        appUserRepository.findByEmailAndDeletedAtIsNull("owner@pin.local").orElseThrow();
    assertThat(stored.getTenantId()).isEqualTo(tenant.getId());
    assertThat(passwordEncoder.matches(PIN, stored.getPinHash())).isTrue();
  }

  @Test
  void ac03_thirdFailedUnlockRevokesSessionAndClearsCookie() throws Exception {
    persistUser(null, "ops@hq.local", AppUserRole.admin_super);
    Cookie cookie = login("ops@hq.local");
    setPin(cookie);

    mockMvc
        .perform(
            post("/api/v1/auth/pin/unlock")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(pinJson(OTHER_PIN)))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("INVALID_PIN"));
    mockMvc
        .perform(
            post("/api/v1/auth/pin/unlock")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(pinJson(OTHER_PIN)))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("INVALID_PIN"));

    mockMvc
        .perform(
            post("/api/v1/auth/pin/unlock")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(pinJson(OTHER_PIN)))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("SESSION_REVOKED"))
        .andExpect(cookie().exists("nmm_access"))
        .andExpect(cookie().maxAge("nmm_access", 0));

    mockMvc.perform(get("/api/v1/auth/me").cookie(cookie)).andExpect(status().isUnauthorized());
    assertThat(activeSessions()).isEmpty();
  }

  @Test
  void ac04_successfulUnlockKeepsTheSameSessionCookie() throws Exception {
    persistUser(null, "ops@hq.local", AppUserRole.admin_super);
    Cookie cookie = login("ops@hq.local");
    setPin(cookie);

    mockMvc
        .perform(
            post("/api/v1/auth/pin/unlock")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(pinJson(OTHER_PIN)))
        .andExpect(status().isUnauthorized());

    UUID sessionId = activeSessions().get(0).getId();
    Cookie refreshed =
        mockMvc
            .perform(
                post("/api/v1/auth/pin/unlock")
                    .cookie(cookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(pinJson(PIN)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.displayName").exists())
            .andExpect(cookie().exists("nmm_access"))
            .andReturn()
            .getResponse()
            .getCookie("nmm_access");
    assertThat(refreshed).isNotNull();
    UserSession session = activeSessions().get(0);
    assertThat(session.getId()).isEqualTo(sessionId);
    assertThat(session.getPinFailedAttempts()).isZero();
    mockMvc.perform(get("/api/v1/auth/me").cookie(refreshed)).andExpect(status().isOk());
    mockMvc.perform(get("/api/v1/auth/me").cookie(cookie)).andExpect(status().isOk());
  }

  @Test
  void ac04_expiredAccessTokenStillUnlocksWhenSessionIsLive() throws Exception {
    persistUser(null, "ops@hq.local", AppUserRole.admin_super);
    Cookie cookie = login("ops@hq.local");
    setPin(cookie);
    Cookie expired = expiredAccessCookie();

    mockMvc.perform(get("/api/v1/auth/me").cookie(expired)).andExpect(status().isUnauthorized());

    Cookie refreshed =
        mockMvc
            .perform(
                post("/api/v1/auth/pin/unlock")
                    .cookie(expired)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(pinJson(PIN)))
            .andExpect(status().isOk())
            .andExpect(cookie().exists("nmm_access"))
            .andReturn()
            .getResponse()
            .getCookie("nmm_access");
    assertThat(refreshed).isNotNull();
    mockMvc.perform(get("/api/v1/auth/me").cookie(refreshed)).andExpect(status().isOk());
  }

  @Test
  void ac04_expiredSessionRejectsCorrectPin() throws Exception {
    persistUser(null, "ops@hq.local", AppUserRole.admin_super);
    Cookie cookie = login("ops@hq.local");
    setPin(cookie);
    UserSession session = activeSessions().get(0);
    session.setExpiresAt(Instant.parse("2020-01-01T00:00:00Z"));
    userSessionRepository.saveAndFlush(session);

    mockMvc
        .perform(
            post("/api/v1/auth/pin/unlock")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(pinJson(PIN)))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
  }

  @Test
  void ac04_wrongPinOnExpiredAccessTokenDoesNotRefreshCookie() throws Exception {
    persistUser(null, "ops@hq.local", AppUserRole.admin_super);
    Cookie cookie = login("ops@hq.local");
    setPin(cookie);
    Cookie expired = expiredAccessCookie();

    mockMvc
        .perform(
            post("/api/v1/auth/pin/unlock")
                .cookie(expired)
                .contentType(MediaType.APPLICATION_JSON)
                .content(pinJson(OTHER_PIN)))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("INVALID_PIN"))
        .andExpect(cookie().doesNotExist("nmm_access"));
  }

  @Test
  void ac05_malformedPinIs400AndDoesNotWriteHash() throws Exception {
    persistUser(null, "ops@hq.local", AppUserRole.admin_super);
    Cookie cookie = login("ops@hq.local");

    mockMvc
        .perform(
            post("/api/v1/auth/pin")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(pinJson("12345")))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    mockMvc
        .perform(
            post("/api/v1/auth/pin")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(pinJson("abcdef")))
        .andExpect(status().isBadRequest());
    mockMvc
        .perform(
            post("/api/v1/auth/pin")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
        .andExpect(status().isBadRequest());

    AppUser stored = appUserRepository.findByEmailAndDeletedAtIsNull("ops@hq.local").orElseThrow();
    assertThat(stored.getPinHash()).isNull();
  }

  @Test
  void ac05_fourthUnlockAfterRevocationIsUnauthorized() throws Exception {
    persistUser(null, "ops@hq.local", AppUserRole.admin_super);
    Cookie cookie = login("ops@hq.local");
    setPin(cookie);
    for (int i = 0; i < 3; i++) {
      mockMvc.perform(
          post("/api/v1/auth/pin/unlock")
              .cookie(cookie)
              .contentType(MediaType.APPLICATION_JSON)
              .content(pinJson(OTHER_PIN)));
    }

    mockMvc
        .perform(
            post("/api/v1/auth/pin/unlock")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(pinJson(PIN)))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
  }

  @Test
  void ac05_unlockWithoutPinIs422AndLeavesSession() throws Exception {
    persistUser(null, "ops@hq.local", AppUserRole.admin_super);
    Cookie cookie = login("ops@hq.local");

    mockMvc
        .perform(
            post("/api/v1/auth/pin/unlock")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(pinJson(PIN)))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("PIN_NOT_SET"));

    mockMvc.perform(get("/api/v1/auth/me").cookie(cookie)).andExpect(status().isOk());
  }

  @Test
  void idempotency_secondPinSetupIsConflict() throws Exception {
    persistUser(null, "ops@hq.local", AppUserRole.admin_super);
    Cookie cookie = login("ops@hq.local");
    setPin(cookie);

    mockMvc
        .perform(
            post("/api/v1/auth/pin")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(pinJson(OTHER_PIN)))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("PIN_ALREADY_SET"));

    AppUser stored = appUserRepository.findByEmailAndDeletedAtIsNull("ops@hq.local").orElseThrow();
    assertThat(passwordEncoder.matches(PIN, stored.getPinHash())).isTrue();
    assertThat(passwordEncoder.matches(OTHER_PIN, stored.getPinHash())).isFalse();
  }

  @Test
  void unauthenticatedPinRoutesAre401() throws Exception {
    mockMvc
        .perform(
            post("/api/v1/auth/pin").contentType(MediaType.APPLICATION_JSON).content(pinJson(PIN)))
        .andExpect(status().isUnauthorized());
    mockMvc
        .perform(
            post("/api/v1/auth/pin/unlock")
                .contentType(MediaType.APPLICATION_JSON)
                .content(pinJson(PIN)))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void isolation_otherTenantSessionCannotUnlock() throws Exception {
    Tenant tenantA = persistTenant("pin-a");
    Tenant tenantB = persistTenant("pin-b");
    persistUser(tenantA.getId(), "a@pin.local", AppUserRole.pharmacy_owner);
    persistUser(tenantB.getId(), "b@pin.local", AppUserRole.pharmacy_owner);

    Cookie cookieA = login("a@pin.local");
    setPin(cookieA);

    UserSession sessionA =
        userSessionRepository.findAll().stream()
            .filter(s -> tenantA.getId().equals(s.getTenantId()))
            .findFirst()
            .orElseThrow();
    sessionA.setTenantId(tenantB.getId());
    userSessionRepository.saveAndFlush(sessionA);

    mockMvc
        .perform(
            post("/api/v1/auth/pin/unlock")
                .cookie(cookieA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(pinJson(PIN)))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void concurrency_overlappingWrongUnlocksRevokeOnce() throws Exception {
    persistUser(null, "race@hq.local", AppUserRole.admin_super);
    Cookie cookie = login("race@hq.local");
    setPin(cookie);

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
                          post("/api/v1/auth/pin/unlock")
                              .cookie(cookie)
                              .contentType(MediaType.APPLICATION_JSON)
                              .content(pinJson(OTHER_PIN)))
                      .andReturn()
                      .getResponse()
                      .getStatus();
                }));
      }
      start.countDown();
      for (Future<Integer> result : results) {
        assertThat(result.get(15, TimeUnit.SECONDS)).isIn(401);
      }
    } finally {
      pool.shutdownNow();
    }

    assertThat(activeSessions()).isEmpty();
    mockMvc.perform(get("/api/v1/auth/me").cookie(cookie)).andExpect(status().isUnauthorized());
  }

  @Test
  void responseDoesNotDisclosePinOrHash() throws Exception {
    persistUser(null, "noleak@hq.local", AppUserRole.admin_super);
    Cookie cookie = login("noleak@hq.local");

    String body =
        mockMvc
            .perform(
                post("/api/v1/auth/pin")
                    .cookie(cookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(pinJson(PIN)))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    JsonNode data = objectMapper.readTree(body).path("data");
    assertThat(data.has("pinHash")).isFalse();
    assertThat(data.has("pin")).isFalse();
    assertThat(body.toLowerCase()).doesNotContain("pin_hash");
    AppUser stored =
        appUserRepository.findByEmailAndDeletedAtIsNull("noleak@hq.local").orElseThrow();
    assertThat(body).doesNotContain(stored.getPinHash());
  }

  private Cookie expiredAccessCookie() {
    UserSession session = activeSessions().get(0);
    AppUser user = appUserRepository.findById(session.getUserId()).orElseThrow();
    Instant past = Instant.parse("2020-01-01T00:00:00Z");
    String expired =
        jwtService.createToken(
            user.getId(),
            session.getId(),
            user.getTenantId(),
            user.getRole(),
            past,
            past.plusSeconds(60));
    return new Cookie("nmm_access", expired);
  }

  private void setPin(Cookie cookie) throws Exception {
    mockMvc
        .perform(
            post("/api/v1/auth/pin")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(pinJson(PIN)))
        .andExpect(status().isOk());
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

  private List<UserSession> activeSessions() {
    return userSessionRepository.findAll().stream().filter(s -> s.getRevokedAt() == null).toList();
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

  private AppUser persistUser(UUID tenantId, String email, AppUserRole role) {
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
    return appUserRepository.saveAndFlush(user);
  }

  private static String pinJson(String pin) {
    return "{\"pin\":\"" + pin + "\"}";
  }
}
