package com.nammamedmate.server.feature.integrations;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.EmailDeliveryStatus;
import com.nammamedmate.server.domain.EmailTemplate;
import com.nammamedmate.server.domain.Notification;
import com.nammamedmate.server.domain.NotificationSource;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TransactionalEmail;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.NotificationRepository;
import com.nammamedmate.server.persistence.NotificationSourceRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.persistence.TransactionalEmailRepository;
import com.nammamedmate.server.persistence.UserSessionRepository;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
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
class ResendWebhookTest {

  private static final Instant T0 = Instant.parse("2026-09-01T08:00:00Z");
  private static final String PROVIDER_ID = "49a3999c-0ce1-4ea6-ab68-afcd6dc2e794";

  @Container
  static final PostgreSQLContainer<?> POSTGRES =
      new PostgreSQLContainer<>("postgres:16-alpine")
          .withDatabaseName("nammamedmate_resend_webhook")
          .withUsername("postgres")
          .withPassword("postgres");

  @DynamicPropertySource
  static void datasource(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
    registry.add("spring.datasource.username", POSTGRES::getUsername);
    registry.add("spring.datasource.password", POSTGRES::getPassword);
    registry.add("app.resend.webhook-secret", () -> "test-webhook-secret");
  }

  @Autowired private MockMvc mockMvc;
  @Autowired private TransactionalEmailRepository emailRepository;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private UserSessionRepository userSessionRepository;
  @Autowired private NotificationRepository notificationRepository;
  @Autowired private NotificationSourceRepository notificationSourceRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @Value("${app.resend.webhook-secret}")
  private String webhookSecret;

  @BeforeEach
  void wipe() {
    notificationRepository.deleteAll();
    notificationSourceRepository.deleteAll();
    emailRepository.deleteAll();
    userSessionRepository.deleteAll();
    appUserRepository.deleteAll();
    tenantRepository.deleteAll();
  }

  @Test
  void ac02_signedSentPromotesQueuedToSent() throws Exception {
    persistQueued(PROVIDER_ID);
    String body = payload("email.sent", PROVIDER_ID);

    mockMvc
        .perform(
            post("/api/v1/integrations/resend/webhook")
                .contentType(MediaType.APPLICATION_JSON)
                .headers(signedHeaders(body))
                .content(body))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data.status").value("accepted"));

    assertThat(emailRepository.findByProviderMessageId(PROVIDER_ID).orElseThrow().getStatus())
        .isEqualTo(EmailDeliveryStatus.SENT);
  }

  @Test
  void ac02_badSignatureIsUnauthorized() throws Exception {
    persistQueued(PROVIDER_ID);
    String body = payload("email.sent", PROVIDER_ID);

    mockMvc
        .perform(
            post("/api/v1/integrations/resend/webhook")
                .contentType(MediaType.APPLICATION_JSON)
                .header("svix-id", "msg_1")
                .header("svix-timestamp", "1710000000")
                .header("svix-signature", "v1,not-a-real-signature")
                .content(body))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.success").value(false))
        .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));

    assertThat(emailRepository.findByProviderMessageId(PROVIDER_ID).orElseThrow().getStatus())
        .isEqualTo(EmailDeliveryStatus.QUEUED);
  }

  @Test
  void ac05_unknownEmailIdIsNotFound() throws Exception {
    String body = payload("email.sent", PROVIDER_ID);

    mockMvc
        .perform(
            post("/api/v1/integrations/resend/webhook")
                .contentType(MediaType.APPLICATION_JSON)
                .headers(signedHeaders(body))
                .content(body))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.success").value(false));
  }

  @Test
  void ac05_webhookDoesNotMutateNotifications() throws Exception {
    Tenant tenant = persistQueued(PROVIDER_ID);
    AppUser owner = persistOwner(tenant.getId());
    NotificationSource source = new NotificationSource();
    source.setId(UUID.randomUUID());
    source.setTenantId(tenant.getId());
    source.setHref("/inbox");
    source.setCreatedAt(T0);
    notificationSourceRepository.saveAndFlush(source);
    Notification notification = new Notification();
    notification.setId(UUID.randomUUID());
    notification.setRecipientUserId(owner.getId());
    notification.setTenantId(tenant.getId());
    notification.setTitle("keep");
    notification.setBody("keep-body");
    notification.setSourceType("inventory");
    notification.setSourceId(source.getId());
    notification.setHref("/inbox");
    notification.setCreatedAt(T0);
    notificationRepository.saveAndFlush(notification);
    long before = notificationRepository.count();
    String body = payload("email.bounced", PROVIDER_ID);

    mockMvc
        .perform(
            post("/api/v1/integrations/resend/webhook")
                .contentType(MediaType.APPLICATION_JSON)
                .headers(signedHeaders(body))
                .content(body))
        .andExpect(status().isOk());

    assertThat(emailRepository.findByProviderMessageId(PROVIDER_ID).orElseThrow().getStatus())
        .isEqualTo(EmailDeliveryStatus.PERMANENT_FAILURE);
    assertThat(notificationRepository.count()).isEqualTo(before);
    assertThat(notificationRepository.findById(notification.getId()).orElseThrow().getTitle())
        .isEqualTo("keep");
  }

  private Tenant persistQueued(String providerId) {
    Tenant tenant = new Tenant();
    tenant.setId(UUID.randomUUID());
    tenant.setName("hook-pharma");
    tenant.setSlug("hook-pharma-" + tenant.getId());
    tenant.setCreatedAt(T0);
    tenant.setUpdatedAt(T0);
    tenantRepository.saveAndFlush(tenant);

    TransactionalEmail row = new TransactionalEmail();
    row.setId(UUID.randomUUID());
    row.setIdempotencyKey("hook-1");
    row.setTenantId(tenant.getId());
    row.setTemplate(EmailTemplate.INVOICE_COPY);
    row.setRecipient("customer@example.com");
    row.setProviderMessageId(providerId);
    row.setStatus(EmailDeliveryStatus.QUEUED);
    row.setCreatedAt(T0);
    row.setUpdatedAt(T0);
    emailRepository.saveAndFlush(row);
    return tenant;
  }

  private AppUser persistOwner(UUID tenantId) {
    AppUser user = new AppUser();
    user.setId(UUID.randomUUID());
    user.setTenantId(tenantId);
    user.setEmail("owner@hook.local");
    user.setPasswordHash(passwordEncoder.encode("counter-pass-1"));
    user.setDisplayName("Owner");
    user.setRole(AppUserRole.pharmacy_owner);
    user.setActive(true);
    user.setStatus(UserAccountStatus.ACTIVE);
    user.setCreatedAt(T0);
    user.setUpdatedAt(T0);
    return appUserRepository.saveAndFlush(user);
  }

  private HttpHeaders signedHeaders(String body) throws Exception {
    String svixId = "msg_1";
    String timestamp = "1710000000";
    String toSign = svixId + "." + timestamp + "." + body;
    Mac mac = Mac.getInstance("HmacSHA256");
    mac.init(new SecretKeySpec(webhookSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
    String signature =
        "v1,"
            + Base64.getEncoder()
                .encodeToString(mac.doFinal(toSign.getBytes(StandardCharsets.UTF_8)));
    HttpHeaders headers = new HttpHeaders();
    headers.add("svix-id", svixId);
    headers.add("svix-timestamp", timestamp);
    headers.add("svix-signature", signature);
    return headers;
  }

  private static String payload(String type, String emailId) {
    return "{\"type\":\"" + type + "\",\"data\":{\"email_id\":\"" + emailId + "\"}}";
  }
}
