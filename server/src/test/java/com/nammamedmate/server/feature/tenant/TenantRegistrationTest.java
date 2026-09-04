package com.nammamedmate.server.feature.tenant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nammamedmate.server.AbstractIntegrationTest;
import com.nammamedmate.server.application.email.AdapterSendRequest;
import com.nammamedmate.server.application.email.AdapterSendResult;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.EmailDeliveryStatus;
import com.nammamedmate.server.domain.EmailVerificationToken;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TenantStatus;
import com.nammamedmate.server.infrastructure.email.ResendEmailAdapter;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.EmailVerificationTokenRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.persistence.TransactionalEmailRepository;
import com.nammamedmate.server.persistence.UserSessionRepository;
import jakarta.servlet.http.Cookie;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

class TenantRegistrationTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Pattern TOKEN_IN_URL = Pattern.compile("token=([^\\s<&\"]+)");

  @MockBean private ResendEmailAdapter resendEmailAdapter;

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private EmailVerificationTokenRepository emailVerificationTokenRepository;
  @Autowired private TransactionalEmailRepository transactionalEmailRepository;
  @Autowired private UserSessionRepository userSessionRepository;
  @Autowired private PasswordEncoder passwordEncoder;
  private final AtomicInteger messageSeq = new AtomicInteger();

  @BeforeEach
  void wipe() {
    emailVerificationTokenRepository.deleteAll();
    transactionalEmailRepository.deleteAll();
    userSessionRepository.deleteAll();
    appUserRepository.deleteAll();
    tenantRepository.deleteAll();
    Mockito.reset(resendEmailAdapter);
    when(resendEmailAdapter.send(any(AdapterSendRequest.class)))
        .thenAnswer(
            invocation ->
                new AdapterSendResult(
                    EmailDeliveryStatus.QUEUED, "msg-onboard-" + messageSeq.incrementAndGet()));
  }

  @Test
  void ac01_registerCapturesBusinessNameEmailPhoneAndPassword() throws Exception {
    mockMvc
        .perform(
            post("/api/v1/tenants/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    registerJson("Asha Chemist", "asha@chemist.local", "9876543210", PASSWORD)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data.email").value("asha@chemist.local"));

    AppUser owner =
        appUserRepository
            .findByNormalizedEmailAndDeletedAtIsNull("asha@chemist.local")
            .orElseThrow();
    assertThat(owner.getPhone()).isEqualTo("9876543210");
    assertThat(passwordEncoder.matches(PASSWORD, owner.getPasswordHash())).isTrue();
    assertThat(owner.getRole().name()).isEqualTo("pharmacy_owner");

    Tenant tenant = tenantRepository.findById(owner.getTenantId()).orElseThrow();
    assertThat(tenant.getName()).isEqualTo("Asha Chemist");
    assertThat(tenant.getSlug()).isEqualTo("asha-chemist");
  }

  @Test
  void ac02_newTenantStartsVerificationRequiredAndModulesStayLocked() throws Exception {
    String token = registerAndExtractToken("Locked Till", "locked@till.local");

    Tenant tenant =
        tenantRepository
            .findById(
                appUserRepository
                    .findByNormalizedEmailAndDeletedAtIsNull("locked@till.local")
                    .orElseThrow()
                    .getTenantId())
            .orElseThrow();
    assertThat(tenant.getStatus()).isEqualTo(TenantStatus.VERIFICATION_REQUIRED);
    assertThat(tenant.getEmailVerifiedAt()).isNull();

    mockMvc
        .perform(
            post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"locked@till.local\",\"password\":\"" + PASSWORD + "\"}"))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("EMAIL_UNVERIFIED"));

    mockMvc
        .perform(
            post("/api/v1/tenants/verify-email")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\":\"" + token + "\"}"))
        .andExpect(status().isOk());

    Cookie cookie =
        mockMvc
            .perform(
                post("/api/v1/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"email\":\"locked@till.local\",\"password\":\"" + PASSWORD + "\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.tenantStatus").value("VERIFICATION_REQUIRED"))
            .andExpect(jsonPath("$.data.emailVerified").value(true))
            .andReturn()
            .getResponse()
            .getCookie("nmm_access");
    assertThat(cookie).isNotNull();

    mockMvc
        .perform(get("/api/v1/auth/me").cookie(cookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.tenantStatus").value("VERIFICATION_REQUIRED"))
        .andExpect(jsonPath("$.data.emailVerified").value(true));

    mockMvc
        .perform(get("/api/v1/users").cookie(cookie))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("TENANT_LOCKED"));

    mockMvc
        .perform(get("/api/v1/roles").cookie(cookie))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("TENANT_LOCKED"));
  }

  @Test
  void ac03_verificationTokenIsSingleUseAndTimeLimited() throws Exception {
    String token = registerAndExtractToken("Token Till", "token@till.local");

    mockMvc
        .perform(
            post("/api/v1/tenants/verify-email")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\":\"" + token + "\"}"))
        .andExpect(status().isOk());

    mockMvc
        .perform(
            post("/api/v1/tenants/verify-email")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\":\"" + token + "\"}"))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("VERIFY_TOKEN_INVALID"));

    EmailVerificationToken expired = emailVerificationTokenRepository.findAll().get(0);
    expired.setConsumedAt(null);
    expired.setExpiresAt(Instant.parse("2020-01-01T00:00:00Z"));
    emailVerificationTokenRepository.saveAndFlush(expired);

    mockMvc
        .perform(
            post("/api/v1/tenants/verify-email")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\":\"" + token + "\"}"))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("VERIFY_TOKEN_INVALID"));
  }

  @Test
  void ac04_noTrialOrPreKycModuleAccessAfterVerify() throws Exception {
    String token = registerAndExtractToken("Pre Kyc", "prekyc@till.local");
    mockMvc
        .perform(
            post("/api/v1/tenants/verify-email")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\":\"" + token + "\"}"))
        .andExpect(status().isOk());

    Tenant tenant =
        tenantRepository
            .findById(
                appUserRepository
                    .findByNormalizedEmailAndDeletedAtIsNull("prekyc@till.local")
                    .orElseThrow()
                    .getTenantId())
            .orElseThrow();
    assertThat(tenant.getStatus()).isEqualTo(TenantStatus.VERIFICATION_REQUIRED);
    assertThat(tenant.getEmailVerifiedAt()).isNotNull();

    Cookie cookie =
        mockMvc
            .perform(
                post("/api/v1/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"email\":\"prekyc@till.local\",\"password\":\"" + PASSWORD + "\"}"))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getCookie("nmm_access");

    mockMvc
        .perform(get("/api/v1/approvals").cookie(cookie))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("TENANT_LOCKED"));
  }

  @Test
  void ac05_duplicateEmailConflictAndInvalidTokenLeaveNoUsableSession() throws Exception {
    registerAndExtractToken("First Shop", "dup@till.local");
    long tenants = tenantRepository.count();
    long users = appUserRepository.count();

    mockMvc
        .perform(
            post("/api/v1/tenants/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(registerJson("Second Shop", "dup@till.local", "9000000000", PASSWORD)))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("EMAIL_TAKEN"));

    assertThat(tenantRepository.count()).isEqualTo(tenants);
    assertThat(appUserRepository.count()).isEqualTo(users);

    mockMvc
        .perform(
            post("/api/v1/tenants/verify-email")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\":\"not-a-real-token\"}"))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("VERIFY_TOKEN_INVALID"));

    mockMvc
        .perform(
            post("/api/v1/tenants/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(registerJson("", "blank@till.local", "9000000001", PASSWORD)))
        .andExpect(status().isBadRequest());

    assertThat(appUserRepository.findByNormalizedEmailAndDeletedAtIsNull("blank@till.local"))
        .isEmpty();
  }

  @Test
  void ac05_shortPasswordLeavesNoPartialTenant() throws Exception {
    long tenants = tenantRepository.count();
    mockMvc
        .perform(
            post("/api/v1/tenants/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(registerJson("Short Pass", "short@till.local", "9111111111", "short")))
        .andExpect(status().isBadRequest());
    assertThat(tenantRepository.count()).isEqualTo(tenants);
    assertThat(appUserRepository.findByNormalizedEmailAndDeletedAtIsNull("short@till.local"))
        .isEmpty();
    assertThat(emailVerificationTokenRepository.count()).isZero();
  }

  private String registerAndExtractToken(String businessName, String email) throws Exception {
    mockMvc
        .perform(
            post("/api/v1/tenants/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(registerJson(businessName, email, "9876543210", PASSWORD)))
        .andExpect(status().isOk());

    ArgumentCaptor<AdapterSendRequest> captor = ArgumentCaptor.forClass(AdapterSendRequest.class);
    Mockito.verify(resendEmailAdapter).send(captor.capture());
    Matcher matcher = TOKEN_IN_URL.matcher(captor.getValue().html());
    assertThat(matcher.find()).isTrue();
    String raw = matcher.group(1);
    assertThat(emailVerificationTokenRepository.findByTokenHash(sha256(raw))).isPresent();
    return raw;
  }

  private static String registerJson(
      String businessName, String email, String phone, String password) {
    return "{\"businessName\":\""
        + businessName
        + "\",\"email\":\""
        + email
        + "\",\"phone\":\""
        + phone
        + "\",\"password\":\""
        + password
        + "\"}";
  }

  private static String sha256(String raw) throws Exception {
    byte[] digest =
        MessageDigest.getInstance("SHA-256").digest(raw.getBytes(StandardCharsets.UTF_8));
    return HexFormat.of().formatHex(digest);
  }
}
