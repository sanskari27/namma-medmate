package com.nammamedmate.server.feature.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nammamedmate.server.application.email.AdapterSendRequest;
import com.nammamedmate.server.application.email.AdapterSendResult;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.EmailDeliveryStatus;
import com.nammamedmate.server.domain.PasswordHistory;
import com.nammamedmate.server.domain.PasswordResetToken;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.infrastructure.email.ResendEmailAdapter;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.PasswordHistoryRepository;
import com.nammamedmate.server.persistence.PasswordResetTokenRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.persistence.TransactionalEmailRepository;
import com.nammamedmate.server.persistence.UserSessionRepository;
import jakarta.servlet.http.Cookie;
import java.time.Duration;
import java.time.Instant;
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
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Testcontainers
class AuthPasswordTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final String NEXT_PASSWORD = "counter-pass-2";
  private static final String THIRD_PASSWORD = "counter-pass-3";
  private static final Pattern TOKEN_IN_URL = Pattern.compile("token=([^\\s<&\"]+)");

  @Container
  static final PostgreSQLContainer<?> POSTGRES =
      new PostgreSQLContainer<>("postgres:16-alpine")
          .withDatabaseName("nammamedmate_password")
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
  @Autowired private PasswordHistoryRepository passwordHistoryRepository;
  @Autowired private PasswordResetTokenRepository passwordResetTokenRepository;
  @Autowired private TransactionalEmailRepository transactionalEmailRepository;
  @Autowired private PasswordEncoder passwordEncoder;
  private final AtomicInteger messageSeq = new AtomicInteger();

  @BeforeEach
  void wipe() {
    passwordResetTokenRepository.deleteAll();
    passwordHistoryRepository.deleteAll();
    transactionalEmailRepository.deleteAll();
    userSessionRepository.deleteAll();
    appUserRepository.deleteAll();
    tenantRepository.deleteAll();
    Mockito.reset(resendEmailAdapter);
    when(resendEmailAdapter.send(any(AdapterSendRequest.class)))
        .thenAnswer(
            invocation ->
                new AdapterSendResult(
                    EmailDeliveryStatus.QUEUED, "msg-reset-" + messageSeq.incrementAndGet()));
  }

  @Test
  void ac01_changeRejectsPasswordShorterThanEightCharacters() throws Exception {
    persistUser(null, "ops@hq.local", AppUserRole.admin_super, null);
    Cookie cookie = login("ops@hq.local", PASSWORD);

    mockMvc
        .perform(
            post("/api/v1/auth/password")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(changeJson(PASSWORD, "short")))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.success").value(false))
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

    AppUser stored =
        appUserRepository.findByNormalizedEmailAndDeletedAtIsNull("ops@hq.local").orElseThrow();
    assertThat(passwordEncoder.matches(PASSWORD, stored.getPasswordHash())).isTrue();
  }

  @Test
  void ac01_unauthenticatedChangeIsUnauthorized() throws Exception {
    mockMvc
        .perform(
            post("/api/v1/auth/password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(changeJson(PASSWORD, NEXT_PASSWORD)))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void ac02_changeRejectsReuseOfCurrentPassword() throws Exception {
    persistUser(null, "ops@hq.local", AppUserRole.admin_super, null);
    Cookie cookie = login("ops@hq.local", PASSWORD);

    mockMvc
        .perform(
            post("/api/v1/auth/password")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(changeJson(PASSWORD, PASSWORD)))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("PASSWORD_REUSED"));
  }

  @Test
  void ac02_changeRejectsReuseOfHistoricalPassword() throws Exception {
    persistUser(null, "ops@hq.local", AppUserRole.admin_super, null);
    Cookie cookie = login("ops@hq.local", PASSWORD);

    mockMvc
        .perform(
            post("/api/v1/auth/password")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(changeJson(PASSWORD, NEXT_PASSWORD)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.mustChangePassword").value(false));

    mockMvc
        .perform(
            post("/api/v1/auth/password")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(changeJson(NEXT_PASSWORD, THIRD_PASSWORD)))
        .andExpect(status().isOk());

    mockMvc
        .perform(
            post("/api/v1/auth/password")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(changeJson(THIRD_PASSWORD, PASSWORD)))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("PASSWORD_REUSED"));

    assertThat(passwordHistoryRepository.findAll()).isNotEmpty();
    assertThat(passwordHistoryRepository.findAll())
        .allSatisfy(row -> assertThat(row.getTenantId()).isNull());
  }

  @Test
  void ac02_loginAfterNinetyDaysRequiresPasswordChangeAndBlocksOtherWrites() throws Exception {
    AppUser owner = persistUser(null, "ops@hq.local", AppUserRole.admin_super, null);
    owner.setPasswordChangedAt(Instant.now().minus(Duration.ofDays(91)));
    appUserRepository.saveAndFlush(owner);

    Cookie cookie =
        mockMvc
            .perform(
                post("/api/v1/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(loginJson("ops@hq.local", PASSWORD)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.mustChangePassword").value(true))
            .andReturn()
            .getResponse()
            .getCookie("nmm_access");
    assertThat(cookie).isNotNull();

    mockMvc
        .perform(
            post("/api/v1/auth/pin")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"pin\":\"123456\"}"))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("PASSWORD_CHANGE_REQUIRED"));

    mockMvc
        .perform(
            post("/api/v1/auth/password")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(changeJson(PASSWORD, NEXT_PASSWORD)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.mustChangePassword").value(false));
  }

  @Test
  void ac03_ownerResetRequestSendsTimeLimitedDispensaryLink() throws Exception {
    Tenant tenant = persistTenant("reset-pharma");
    persistUser(tenant.getId(), "owner@reset.local", AppUserRole.pharmacy_owner, null);

    mockMvc
        .perform(
            post("/api/v1/auth/password/reset-request")
                .contentType(MediaType.APPLICATION_JSON)
                .content(emailJson("  OWNER@Reset.Local ")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data.accepted").value(true));

    AdapterSendRequest sent = captureSend();
    assertThat(sent.recipient()).isEqualTo("owner@reset.local");
    assertThat(sent.html()).contains("http://localhost:5173/reset-password?token=");
    String token = tokenFrom(sent.html());
    assertThat(token).isNotBlank();
    assertThat(passwordResetTokenRepository.findAll()).hasSize(1);
    PasswordResetToken stored = passwordResetTokenRepository.findAll().get(0);
    assertThat(stored.getTenantId()).isEqualTo(tenant.getId());
    assertThat(stored.getConsumedAt()).isNull();
    assertThat(stored.getExpiresAt()).isAfter(Instant.now().plus(Duration.ofMinutes(50)));
  }

  @Test
  void ac03_masterResetRequestSendsAdminLink() throws Exception {
    persistUser(null, "ops@hq.local", AppUserRole.admin_super, null);

    mockMvc
        .perform(
            post("/api/v1/auth/password/reset-request")
                .contentType(MediaType.APPLICATION_JSON)
                .content(emailJson("ops@hq.local")))
        .andExpect(status().isOk());

    assertThat(captureSend().html()).contains("http://localhost:5174/reset-password?token=");
  }

  @Test
  void ac03_staffAndUnknownEmailReturnOpaqueSuccessWithoutSending() throws Exception {
    Tenant tenant = persistTenant("opaque-pharma");
    AppUser owner =
        persistUser(tenant.getId(), "owner@opaque.local", AppUserRole.pharmacy_owner, null);
    persistUser(tenant.getId(), "staff@opaque.local", AppUserRole.pharmacy_staff, owner.getId());

    mockMvc
        .perform(
            post("/api/v1/auth/password/reset-request")
                .contentType(MediaType.APPLICATION_JSON)
                .content(emailJson("staff@opaque.local")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.accepted").value(true));
    mockMvc
        .perform(
            post("/api/v1/auth/password/reset-request")
                .contentType(MediaType.APPLICATION_JSON)
                .content(emailJson("missing@opaque.local")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.accepted").value(true));

    verify(resendEmailAdapter, never()).send(any(AdapterSendRequest.class));
    assertThat(passwordResetTokenRepository.count()).isZero();
  }

  @Test
  void ac03_completeResetWithValidTokenSetsNewPassword() throws Exception {
    persistUser(null, "ops@hq.local", AppUserRole.admin_super, null);
    String token = requestResetToken("ops@hq.local");

    mockMvc
        .perform(
            post("/api/v1/auth/password/reset")
                .contentType(MediaType.APPLICATION_JSON)
                .content(completeJson(token, NEXT_PASSWORD)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true));

    mockMvc
        .perform(
            post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginJson("ops@hq.local", NEXT_PASSWORD)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.mustChangePassword").value(false));
  }

  @Test
  void ac05_expiredConsumedTamperedAndReusedTokensAreRejectedWithoutDisclosure() throws Exception {
    persistUser(null, "ops@hq.local", AppUserRole.admin_super, null);
    String token = requestResetToken("ops@hq.local");

    mockMvc
        .perform(
            post("/api/v1/auth/password/reset")
                .contentType(MediaType.APPLICATION_JSON)
                .content(completeJson(token, NEXT_PASSWORD)))
        .andExpect(status().isOk());

    String consumed =
        mockMvc
            .perform(
                post("/api/v1/auth/password/reset")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(completeJson(token, THIRD_PASSWORD)))
            .andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.code").value("RESET_TOKEN_INVALID"))
            .andReturn()
            .getResponse()
            .getContentAsString();

    String tampered =
        mockMvc
            .perform(
                post("/api/v1/auth/password/reset")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(completeJson("not-a-real-token", THIRD_PASSWORD)))
            .andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.code").value("RESET_TOKEN_INVALID"))
            .andReturn()
            .getResponse()
            .getContentAsString();

    JsonNode consumedJson = objectMapper.readTree(consumed);
    JsonNode tamperedJson = objectMapper.readTree(tampered);
    assertThat(consumedJson.path("message").asText())
        .isEqualTo(tamperedJson.path("message").asText());
    assertThat(consumed).doesNotContain("ops@hq.local");

    String fresh = requestResetToken("ops@hq.local");
    PasswordResetToken row =
        passwordResetTokenRepository.findAll().stream()
            .filter(t -> t.getConsumedAt() == null)
            .findFirst()
            .orElseThrow();
    row.setExpiresAt(Instant.now().minusSeconds(5));
    passwordResetTokenRepository.saveAndFlush(row);

    mockMvc
        .perform(
            post("/api/v1/auth/password/reset")
                .contentType(MediaType.APPLICATION_JSON)
                .content(completeJson(fresh, THIRD_PASSWORD)))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("RESET_TOKEN_INVALID"));
  }

  @Test
  void ac05_completeResetRejectsReusedPasswordAndLeavesTokenUsable() throws Exception {
    persistUser(null, "ops@hq.local", AppUserRole.admin_super, null);
    String token = requestResetToken("ops@hq.local");

    mockMvc
        .perform(
            post("/api/v1/auth/password/reset")
                .contentType(MediaType.APPLICATION_JSON)
                .content(completeJson(token, PASSWORD)))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("PASSWORD_REUSED"));

    mockMvc
        .perform(
            post("/api/v1/auth/password/reset")
                .contentType(MediaType.APPLICATION_JSON)
                .content(completeJson(token, NEXT_PASSWORD)))
        .andExpect(status().isOk());
  }

  @Test
  void ac03_secondResetRequestInvalidatesThePreviousToken() throws Exception {
    persistUser(null, "ops@hq.local", AppUserRole.admin_super, null);
    String first = requestResetToken("ops@hq.local");
    String second = requestResetToken("ops@hq.local");
    verify(resendEmailAdapter, times(2)).send(any(AdapterSendRequest.class));

    mockMvc
        .perform(
            post("/api/v1/auth/password/reset")
                .contentType(MediaType.APPLICATION_JSON)
                .content(completeJson(first, NEXT_PASSWORD)))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("RESET_TOKEN_INVALID"));

    mockMvc
        .perform(
            post("/api/v1/auth/password/reset")
                .contentType(MediaType.APPLICATION_JSON)
                .content(completeJson(second, NEXT_PASSWORD)))
        .andExpect(status().isOk());
  }

  @Test
  void ac04_ownerAdminResetSetsTemporaryPasswordThatMustBeChanged() throws Exception {
    Tenant tenant = persistTenant("staff-pharma");
    AppUser owner =
        persistUser(tenant.getId(), "owner@staff.local", AppUserRole.pharmacy_owner, null);
    persistUser(tenant.getId(), "clerk@staff.local", AppUserRole.pharmacy_staff, owner.getId());
    Cookie ownerCookie = login("owner@staff.local", PASSWORD);

    mockMvc
        .perform(
            post("/api/v1/auth/password/admin-reset")
                .cookie(ownerCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(adminResetJson("clerk@staff.local", "temp-pass-9")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.mustChangePassword").value(true));

    Cookie staffCookie =
        mockMvc
            .perform(
                post("/api/v1/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(loginJson("clerk@staff.local", "temp-pass-9")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.mustChangePassword").value(true))
            .andExpect(jsonPath("$.data.role").value("pharmacy_staff"))
            .andReturn()
            .getResponse()
            .getCookie("nmm_access");
    assertThat(staffCookie).isNotNull();

    mockMvc
        .perform(
            post("/api/v1/auth/password")
                .cookie(staffCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(changeJson("temp-pass-9", NEXT_PASSWORD)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.mustChangePassword").value(false));
  }

  @Test
  void ac04_staffCannotAdminResetAndOwnerCannotResetAnotherTenant() throws Exception {
    Tenant tenantA = persistTenant("iso-a");
    Tenant tenantB = persistTenant("iso-b");
    AppUser ownerA = persistUser(tenantA.getId(), "a@iso.local", AppUserRole.pharmacy_owner, null);
    persistUser(tenantA.getId(), "clerk-a@iso.local", AppUserRole.pharmacy_staff, ownerA.getId());
    AppUser ownerB = persistUser(tenantB.getId(), "b@iso.local", AppUserRole.pharmacy_owner, null);
    persistUser(tenantB.getId(), "clerk-b@iso.local", AppUserRole.pharmacy_staff, ownerB.getId());

    Cookie staffCookie = login("clerk-a@iso.local", PASSWORD);
    mockMvc
        .perform(
            post("/api/v1/auth/password/admin-reset")
                .cookie(staffCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(adminResetJson("clerk-b@iso.local", NEXT_PASSWORD)))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));

    Cookie ownerCookie = login("a@iso.local", PASSWORD);
    String cross =
        mockMvc
            .perform(
                post("/api/v1/auth/password/admin-reset")
                    .cookie(ownerCookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(adminResetJson("clerk-b@iso.local", NEXT_PASSWORD)))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("NOT_FOUND"))
            .andReturn()
            .getResponse()
            .getContentAsString();
    assertThat(cross).doesNotContain("clerk-b");

    mockMvc
        .perform(
            post("/api/v1/auth/password/admin-reset")
                .cookie(ownerCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(adminResetJson("a@iso.local", NEXT_PASSWORD)))
        .andExpect(status().isNotFound());
  }

  @Test
  void persistence_pharmacyHistoryAndTokensIncludeTenantId() throws Exception {
    Tenant tenant = persistTenant("hist-pharma");
    persistUser(tenant.getId(), "owner@hist.local", AppUserRole.pharmacy_owner, null);
    Cookie cookie = login("owner@hist.local", PASSWORD);

    mockMvc
        .perform(
            post("/api/v1/auth/password")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(changeJson(PASSWORD, NEXT_PASSWORD)))
        .andExpect(status().isOk());

    PasswordHistory history = passwordHistoryRepository.findAll().get(0);
    assertThat(history.getTenantId()).isEqualTo(tenant.getId());
    assertThat(history.getUserId()).isNotNull();

    requestResetToken("owner@hist.local");
    assertThat(passwordResetTokenRepository.findAll())
        .allSatisfy(token -> assertThat(token.getTenantId()).isEqualTo(tenant.getId()));
  }

  @Test
  void negative_otpAndSocialLoginRemainAbsent() throws Exception {
    mockMvc.perform(post("/api/v1/auth/otp")).andExpect(status().isUnauthorized());
    mockMvc.perform(post("/api/v1/auth/social")).andExpect(status().isUnauthorized());
  }

  private String requestResetToken(String email) throws Exception {
    mockMvc
        .perform(
            post("/api/v1/auth/password/reset-request")
                .contentType(MediaType.APPLICATION_JSON)
                .content(emailJson(email)))
        .andExpect(status().isOk());
    return tokenFrom(captureSend().html());
  }

  private AdapterSendRequest captureSend() {
    ArgumentCaptor<AdapterSendRequest> captor = ArgumentCaptor.forClass(AdapterSendRequest.class);
    verify(resendEmailAdapter, org.mockito.Mockito.atLeastOnce()).send(captor.capture());
    return captor.getValue();
  }

  private static String tokenFrom(String html) {
    Matcher matcher = TOKEN_IN_URL.matcher(html);
    assertThat(matcher.find()).isTrue();
    return matcher.group(1);
  }

  private Cookie login(String email, String password) throws Exception {
    Cookie cookie =
        mockMvc
            .perform(
                post("/api/v1/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(loginJson(email, password)))
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

  private static String loginJson(String email, String password) {
    return "{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}";
  }

  private static String changeJson(String currentPassword, String newPassword) {
    return "{\"currentPassword\":\""
        + currentPassword
        + "\",\"newPassword\":\""
        + newPassword
        + "\"}";
  }

  private static String emailJson(String email) {
    return "{\"email\":\"" + email + "\"}";
  }

  private static String completeJson(String token, String password) {
    return "{\"token\":\"" + token + "\",\"password\":\"" + password + "\"}";
  }

  private static String adminResetJson(String email, String password) {
    return "{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}";
  }
}
