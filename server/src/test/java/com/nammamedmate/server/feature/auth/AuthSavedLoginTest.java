package com.nammamedmate.server.feature.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nammamedmate.server.application.email.AdapterSendRequest;
import com.nammamedmate.server.application.email.AdapterSendResult;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.EmailDeliveryStatus;
import com.nammamedmate.server.domain.SavedLogin;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.domain.UserSession;
import com.nammamedmate.server.infrastructure.email.ResendEmailAdapter;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.PasswordHistoryRepository;
import com.nammamedmate.server.persistence.PasswordResetTokenRepository;
import com.nammamedmate.server.persistence.SavedLoginRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.persistence.TransactionalEmailRepository;
import com.nammamedmate.server.persistence.UserSessionRepository;
import jakarta.servlet.http.Cookie;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
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
class AuthSavedLoginTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final String NEXT_PASSWORD = "counter-pass-2";
  private static final String PIN = "123456";
  private static final String OTHER_PIN = "654321";
  private static final Pattern TOKEN_IN_URL = Pattern.compile("token=([^\\s<&\"]+)");

  @Container
  static final PostgreSQLContainer<?> POSTGRES =
      new PostgreSQLContainer<>("postgres:16-alpine")
          .withDatabaseName("nammamedmate_saved")
          .withUsername("postgres")
          .withPassword("postgres");

  @DynamicPropertySource
  static void datasource(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
    registry.add("spring.datasource.username", POSTGRES::getUsername);
    registry.add("spring.datasource.password", POSTGRES::getPassword);
  }

  @MockBean private ResendEmailAdapter resendEmailAdapter;

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private UserSessionRepository userSessionRepository;
  @Autowired private SavedLoginRepository savedLoginRepository;
  @Autowired private PasswordResetTokenRepository passwordResetTokenRepository;
  @Autowired private PasswordHistoryRepository passwordHistoryRepository;
  @Autowired private TransactionalEmailRepository transactionalEmailRepository;
  @Autowired private PasswordEncoder passwordEncoder;
  private final AtomicInteger messageSeq = new AtomicInteger();

  @BeforeEach
  void wipeAuthTables() {
    passwordResetTokenRepository.deleteAll();
    passwordHistoryRepository.deleteAll();
    transactionalEmailRepository.deleteAll();
    userSessionRepository.deleteAll();
    savedLoginRepository.deleteAll();
    appUserRepository.deleteAll();
    tenantRepository.deleteAll();
    Mockito.reset(resendEmailAdapter);
    when(resendEmailAdapter.send(any(AdapterSendRequest.class)))
        .thenAnswer(
            invocation ->
                new AdapterSendResult(
                    EmailDeliveryStatus.QUEUED, "msg-saved-" + messageSeq.incrementAndGet()));
  }

  @Test
  void ac01_enrolledPersonAppearsOnThisDeviceAfterSignOut() throws Exception {
    AppUser user = persistUser(null, "ops@hq.local", AppUserRole.admin_super);
    AuthCookies cookies = login("ops@hq.local");
    assertThat(cookies.device()).isNotNull();
    setPin(cookies);

    mockMvc
        .perform(get("/api/v1/auth/saved-logins").cookie(cookies.device()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items.length()").value(1))
        .andExpect(jsonPath("$.data.items[0].userId").value(user.getId().toString()))
        .andExpect(jsonPath("$.data.items[0].displayName").value("Test ops@hq.local"))
        .andExpect(jsonPath("$.data.items[0].role").value("admin_super"))
        .andExpect(jsonPath("$.data.items[0].email").value("ops@hq.local"));

    mockMvc
        .perform(post("/api/v1/auth/logout").cookie(cookies.access()))
        .andExpect(status().isOk())
        .andExpect(cookie().maxAge("nmm_access", 0));

    mockMvc
        .perform(get("/api/v1/auth/me").cookie(cookies.access()))
        .andExpect(status().isUnauthorized());

    mockMvc
        .perform(get("/api/v1/auth/saved-logins").cookie(cookies.device()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items[0].userId").value(user.getId().toString()));
  }

  @Test
  void ac02_twoPeopleOnOneDeviceAndPinStartsANewSession() throws Exception {
    AppUser first = persistUser(null, "ops@hq.local", AppUserRole.admin_super);
    AppUser second = persistUser(null, "desk@hq.local", AppUserRole.admin_super);
    AuthCookies firstLogin = enrollOnDevice("ops@hq.local", null);
    AuthCookies secondLogin = enrollOnDevice("desk@hq.local", firstLogin.device());

    JsonNode items =
        objectMapper
            .readTree(
                mockMvc
                    .perform(get("/api/v1/auth/saved-logins").cookie(firstLogin.device()))
                    .andExpect(status().isOk())
                    .andReturn()
                    .getResponse()
                    .getContentAsString())
            .path("data")
            .path("items");
    assertThat(items).hasSize(2);
    assertThat(List.of(items.get(0).path("email").asText(), items.get(1).path("email").asText()))
        .containsExactlyInAnyOrder("ops@hq.local", "desk@hq.local");

    Cookie pinAccess =
        mockMvc
            .perform(
                post("/api/v1/auth/pin/login")
                    .cookie(firstLogin.device())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(pinLoginJson(first.getId(), PIN)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.userId").value(first.getId().toString()))
            .andExpect(jsonPath("$.data.pinSet").value(true))
            .andExpect(cookie().exists("nmm_access"))
            .andReturn()
            .getResponse()
            .getCookie("nmm_access");
    assertThat(pinAccess).isNotNull();
    mockMvc.perform(get("/api/v1/auth/me").cookie(pinAccess)).andExpect(status().isOk());
    mockMvc
        .perform(get("/api/v1/auth/me").cookie(firstLogin.access()))
        .andExpect(status().isUnauthorized());
    assertThat(activeSessionsFor(first.getId())).hasSize(1);
    assertThat(secondLogin.access()).isNotNull();
  }

  @Test
  void ac03_pinWithoutDeviceBindingIsRejected() throws Exception {
    AppUser user = persistUser(null, "ops@hq.local", AppUserRole.admin_super);
    enrollOnDevice("ops@hq.local", null);

    mockMvc
        .perform(
            post("/api/v1/auth/pin/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(pinLoginJson(user.getId(), PIN)))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));

    mockMvc
        .perform(get("/api/v1/auth/saved-logins"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items.length()").value(0))
        .andExpect(cookie().exists("nmm_device"));
  }

  @Test
  void ac04_logoutKeepsSavedPeopleAndClearsAccess() throws Exception {
    AppUser user = persistUser(null, "ops@hq.local", AppUserRole.admin_super);
    AuthCookies cookies = enrollOnDevice("ops@hq.local", null);

    mockMvc
        .perform(post("/api/v1/auth/logout").cookie(cookies.access()).cookie(cookies.device()))
        .andExpect(status().isOk())
        .andExpect(cookie().maxAge("nmm_access", 0));

    mockMvc
        .perform(get("/api/v1/auth/saved-logins").cookie(cookies.device()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items[0].userId").value(user.getId().toString()));
  }

  @Test
  void ac05_threeFailedPinsDropThatPersonOnThisDevice() throws Exception {
    AppUser user = persistUser(null, "ops@hq.local", AppUserRole.admin_super);
    AuthCookies cookies = enrollOnDevice("ops@hq.local", null);

    for (int i = 0; i < 2; i++) {
      mockMvc
          .perform(
              post("/api/v1/auth/pin/login")
                  .cookie(cookies.device())
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(pinLoginJson(user.getId(), OTHER_PIN)))
          .andExpect(status().isUnauthorized())
          .andExpect(jsonPath("$.code").value("INVALID_PIN"));
    }
    mockMvc
        .perform(
            post("/api/v1/auth/pin/login")
                .cookie(cookies.device())
                .contentType(MediaType.APPLICATION_JSON)
                .content(pinLoginJson(user.getId(), OTHER_PIN)))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("INVALID_PIN"));

    mockMvc
        .perform(get("/api/v1/auth/saved-logins").cookie(cookies.device()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items.length()").value(0));

    mockMvc
        .perform(
            post("/api/v1/auth/pin/login")
                .cookie(cookies.device())
                .contentType(MediaType.APPLICATION_JSON)
                .content(pinLoginJson(user.getId(), PIN)))
        .andExpect(status().isUnauthorized());

    AuthCookies passwordAgain = login("ops@hq.local", cookies.device());
    mockMvc
        .perform(get("/api/v1/auth/me").cookie(passwordAgain.access()))
        .andExpect(status().isOk());
  }

  @Test
  void ac06_expiredBindingIsOmittedAndCannotPinLogin() throws Exception {
    AppUser user = persistUser(null, "ops@hq.local", AppUserRole.admin_super);
    AuthCookies cookies = enrollOnDevice("ops@hq.local", null);
    SavedLogin binding =
        savedLoginRepository.findAll().stream()
            .filter(row -> row.getUserId().equals(user.getId()))
            .findFirst()
            .orElseThrow();
    binding.setExpiresAt(Instant.parse("2020-01-01T00:00:00Z"));
    savedLoginRepository.saveAndFlush(binding);

    mockMvc
        .perform(get("/api/v1/auth/saved-logins").cookie(cookies.device()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items.length()").value(0));

    mockMvc
        .perform(
            post("/api/v1/auth/pin/login")
                .cookie(cookies.device())
                .contentType(MediaType.APPLICATION_JSON)
                .content(pinLoginJson(user.getId(), PIN)))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void ac06_passwordChangeRevokesSavedDevices() throws Exception {
    AppUser user = persistUser(null, "ops@hq.local", AppUserRole.admin_super);
    AuthCookies cookies = enrollOnDevice("ops@hq.local", null);

    mockMvc
        .perform(
            post("/api/v1/auth/password")
                .cookie(cookies.access())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"currentPassword\":\""
                        + PASSWORD
                        + "\",\"newPassword\":\""
                        + NEXT_PASSWORD
                        + "\"}"))
        .andExpect(status().isOk());

    mockMvc
        .perform(get("/api/v1/auth/saved-logins").cookie(cookies.device()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items.length()").value(0));

    mockMvc
        .perform(
            post("/api/v1/auth/pin/login")
                .cookie(cookies.device())
                .contentType(MediaType.APPLICATION_JSON)
                .content(pinLoginJson(user.getId(), PIN)))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void ac06_emailResetRevokesSavedDevices() throws Exception {
    AppUser user = persistUser(null, "ops@hq.local", AppUserRole.admin_super);
    AuthCookies cookies = enrollOnDevice("ops@hq.local", null);
    String token = requestResetToken("ops@hq.local");

    mockMvc
        .perform(
            post("/api/v1/auth/password/reset")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\":\"" + token + "\",\"password\":\"" + NEXT_PASSWORD + "\"}"))
        .andExpect(status().isOk());

    mockMvc
        .perform(get("/api/v1/auth/saved-logins").cookie(cookies.device()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items.length()").value(0));

    mockMvc
        .perform(
            post("/api/v1/auth/pin/login")
                .cookie(cookies.device())
                .contentType(MediaType.APPLICATION_JSON)
                .content(pinLoginJson(user.getId(), PIN)))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void ac06_adminResetRevokesSavedDevices() throws Exception {
    Tenant tenant = persistTenant("saved-reset");
    AppUser owner =
        persistUser(tenant.getId(), "owner@saved.local", AppUserRole.pharmacy_owner, null);
    AppUser staff =
        persistUser(tenant.getId(), "clerk@saved.local", AppUserRole.pharmacy_staff, owner.getId());
    AuthCookies staffCookies = enrollOnDevice("clerk@saved.local", null);
    AuthCookies ownerCookies = login("owner@saved.local");

    mockMvc
        .perform(
            post("/api/v1/auth/password/admin-reset")
                .cookie(ownerCookies.access())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"email\":\"clerk@saved.local\",\"password\":\"" + NEXT_PASSWORD + "\"}"))
        .andExpect(status().isOk());

    mockMvc
        .perform(get("/api/v1/auth/saved-logins").cookie(staffCookies.device()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items.length()").value(0));

    mockMvc
        .perform(
            post("/api/v1/auth/pin/login")
                .cookie(staffCookies.device())
                .contentType(MediaType.APPLICATION_JSON)
                .content(pinLoginJson(staff.getId(), PIN)))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void ac07_deactivatedUserIsOmittedAndMalformedPinIs400() throws Exception {
    Tenant tenant = persistTenant("saved-a");
    AppUser user = persistUser(tenant.getId(), "owner@saved.local", AppUserRole.pharmacy_owner);
    AuthCookies cookies = enrollOnDevice("owner@saved.local", null);

    mockMvc
        .perform(
            post("/api/v1/auth/pin/login")
                .cookie(cookies.device())
                .contentType(MediaType.APPLICATION_JSON)
                .content(pinLoginJson(user.getId(), "12ab56")))
        .andExpect(status().isBadRequest());

    user.setStatus(UserAccountStatus.SUSPENDED);
    appUserRepository.saveAndFlush(user);

    mockMvc
        .perform(get("/api/v1/auth/saved-logins").cookie(cookies.device()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items.length()").value(0));

    mockMvc
        .perform(
            post("/api/v1/auth/pin/login")
                .cookie(cookies.device())
                .contentType(MediaType.APPLICATION_JSON)
                .content(pinLoginJson(user.getId(), PIN)))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("ACCOUNT_CANNOT_SIGN_IN"));
  }

  @Test
  void isolation_otherDeviceCannotPinLogin() throws Exception {
    Tenant tenantA = persistTenant("till-a");
    Tenant tenantB = persistTenant("till-b");
    AppUser userA = persistUser(tenantA.getId(), "a@till.local", AppUserRole.pharmacy_owner);
    persistUser(tenantB.getId(), "b@till.local", AppUserRole.pharmacy_owner);
    AuthCookies deviceA = enrollOnDevice("a@till.local", null);
    AuthCookies deviceB = enrollOnDevice("b@till.local", null);

    mockMvc
        .perform(get("/api/v1/auth/saved-logins").cookie(deviceA.device()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items.length()").value(1))
        .andExpect(jsonPath("$.data.items[0].email").value("a@till.local"));

    mockMvc
        .perform(
            post("/api/v1/auth/pin/login")
                .cookie(deviceA.device())
                .contentType(MediaType.APPLICATION_JSON)
                .content(pinLoginJson(userA.getId(), PIN)))
        .andExpect(status().isOk());

    AppUser userB = appUserRepository.findByEmailAndDeletedAtIsNull("b@till.local").orElseThrow();
    mockMvc
        .perform(
            post("/api/v1/auth/pin/login")
                .cookie(deviceA.device())
                .contentType(MediaType.APPLICATION_JSON)
                .content(pinLoginJson(userB.getId(), PIN)))
        .andExpect(status().isUnauthorized());
    assertThat(deviceB.device().getValue()).isNotEqualTo(deviceA.device().getValue());
  }

  @Test
  void forgetRemovesOnlyThatPersonOnThisDevice() throws Exception {
    AppUser first = persistUser(null, "ops@hq.local", AppUserRole.admin_super);
    persistUser(null, "desk@hq.local", AppUserRole.admin_super);
    AuthCookies cookies = enrollOnDevice("ops@hq.local", null);
    enrollOnDevice("desk@hq.local", cookies.device());

    mockMvc
        .perform(delete("/api/v1/auth/saved-logins/" + first.getId()).cookie(cookies.device()))
        .andExpect(status().isOk());

    mockMvc
        .perform(get("/api/v1/auth/saved-logins").cookie(cookies.device()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items.length()").value(1))
        .andExpect(jsonPath("$.data.items[0].email").value("desk@hq.local"));
  }

  @Test
  void unauthenticatedLogoutIs401() throws Exception {
    mockMvc.perform(post("/api/v1/auth/logout")).andExpect(status().isUnauthorized());
  }

  private String requestResetToken(String email) throws Exception {
    mockMvc
        .perform(
            post("/api/v1/auth/password/reset-request")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\"}"))
        .andExpect(status().isOk());
    ArgumentCaptor<AdapterSendRequest> captor = ArgumentCaptor.forClass(AdapterSendRequest.class);
    verify(resendEmailAdapter, Mockito.atLeastOnce()).send(captor.capture());
    Matcher matcher = TOKEN_IN_URL.matcher(captor.getValue().html());
    assertThat(matcher.find()).isTrue();
    return matcher.group(1);
  }

  private AuthCookies enrollOnDevice(String email, Cookie device) throws Exception {
    AuthCookies cookies = login(email, device);
    setPin(cookies);
    return cookies;
  }

  private void setPin(AuthCookies cookies) throws Exception {
    mockMvc
        .perform(
            post("/api/v1/auth/pin")
                .cookie(cookies.access(), cookies.device())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"pin\":\"" + PIN + "\"}"))
        .andExpect(status().isOk());
  }

  private AuthCookies login(String email) throws Exception {
    return login(email, null);
  }

  private AuthCookies login(String email, Cookie device) throws Exception {
    var request =
        post("/api/v1/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"email\":\"" + email + "\",\"password\":\"" + PASSWORD + "\"}");
    if (device != null) {
      request.cookie(device);
    }
    MvcResult result = mockMvc.perform(request).andExpect(status().isOk()).andReturn();
    Cookie access = result.getResponse().getCookie("nmm_access");
    Cookie issued = result.getResponse().getCookie("nmm_device");
    assertThat(access).isNotNull();
    Cookie keepDevice = issued != null ? issued : device;
    assertThat(keepDevice).isNotNull();
    return new AuthCookies(access, keepDevice);
  }

  private List<UserSession> activeSessionsFor(UUID userId) {
    return userSessionRepository.findAll().stream()
        .filter(session -> session.getUserId().equals(userId) && session.getRevokedAt() == null)
        .toList();
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
    return persistUser(tenantId, email, role, null);
  }

  private AppUser persistUser(UUID tenantId, String email, AppUserRole role, UUID createdBy) {
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
    user.setCreatedBy(createdBy);
    user.setCreatedAt(now);
    user.setUpdatedAt(now);
    return appUserRepository.saveAndFlush(user);
  }

  private static String pinLoginJson(UUID userId, String pin) {
    return "{\"userId\":\"" + userId + "\",\"pin\":\"" + pin + "\"}";
  }

  private record AuthCookies(Cookie access, Cookie device) {}
}
