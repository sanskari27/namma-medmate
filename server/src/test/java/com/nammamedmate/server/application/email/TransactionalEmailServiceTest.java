package com.nammamedmate.server.application.email;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.nammamedmate.server.domain.EmailDeliveryStatus;
import com.nammamedmate.server.domain.EmailTemplate;
import com.nammamedmate.server.domain.TransactionalEmail;
import com.nammamedmate.server.infrastructure.email.ResendEmailAdapter;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.persistence.TransactionalEmailRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;

@ExtendWith(MockitoExtension.class)
class TransactionalEmailServiceTest {

  private static final Instant NOW = Instant.parse("2026-09-02T12:00:00Z");
  private static final String RECIPIENT = "owner@pharmacy.local";
  private static final String RESET_URL = "https://app.example/reset?t=secret-reset-token-xyz";

  @Mock private TransactionalEmailRepository emailRepository;
  @Mock private TenantRepository tenantRepository;
  @Mock private ResendEmailAdapter resendEmailAdapter;

  private TransactionalEmailService service;
  private ListAppender<ILoggingEvent> logAppender;
  private Logger logger;

  @BeforeEach
  void setUp() {
    service =
        new TransactionalEmailService(
            emailRepository,
            tenantRepository,
            resendEmailAdapter,
            Clock.fixed(NOW, ZoneOffset.UTC));
    logger = (Logger) LoggerFactory.getLogger(TransactionalEmailService.class);
    logAppender = new ListAppender<>();
    logAppender.start();
    logger.addAppender(logAppender);
  }

  @AfterEach
  void tearDown() {
    logger.detachAppender(logAppender);
  }

  @Test
  void ac01_unknownTemplateFailsBeforeProvider() {
    SendEmailCommand command =
        new SendEmailCommand(null, RECIPIENT, null, null, Map.of("resetUrl", RESET_URL), "reset-1");

    assertValidation(command);
    verify(resendEmailAdapter, never()).send(any());
    verify(emailRepository, never()).save(any());
  }

  @Test
  void ac01_unknownVariableFailsBeforeProvider() {
    SendEmailCommand command =
        passwordReset(Map.of("resetUrl", RESET_URL, "extra", "nope"), "reset-extra");

    assertValidation(command);
    verify(resendEmailAdapter, never()).send(any());
  }

  @Test
  void ac01_missingVariableFailsBeforeProvider() {
    SendEmailCommand command = passwordReset(Map.of(), "reset-missing");

    assertValidation(command);
    verify(resendEmailAdapter, never()).send(any());
  }

  @Test
  void ac01_invalidRecipientFailsBeforeProvider() {
    SendEmailCommand command =
        new SendEmailCommand(
            EmailTemplate.PASSWORD_RESET,
            "not-an-email",
            null,
            null,
            Map.of("resetUrl", RESET_URL),
            "reset-bad-to");

    assertValidation(command);
    verify(resendEmailAdapter, never()).send(any());
  }

  @Test
  void ac05_unknownTenantFailsBeforeProvider() {
    UUID tenantId = UUID.randomUUID();
    when(tenantRepository.existsById(tenantId)).thenReturn(false);
    SendEmailCommand command =
        new SendEmailCommand(
            EmailTemplate.PASSWORD_RESET,
            RECIPIENT,
            tenantId,
            null,
            Map.of("resetUrl", RESET_URL),
            "reset-no-tenant");

    assertThatThrownBy(() -> service.send(command))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getStatus(), ex -> ((ApiException) ex).getCode())
        .containsExactly(HttpStatus.UNPROCESSABLE_ENTITY, "TENANT_NOT_FOUND");
    verify(resendEmailAdapter, never()).send(any());
  }

  @Test
  void ac04_logsOmitSecretRecipientAndResetUrl() {
    TransactionalEmail saved = newRow(null, "reset-log", EmailDeliveryStatus.QUEUED, "msg-1");
    when(emailRepository.findByIdempotencyKey("reset-log")).thenReturn(Optional.empty());
    when(emailRepository.save(any(TransactionalEmail.class))).thenReturn(saved);
    when(resendEmailAdapter.send(any()))
        .thenReturn(new AdapterSendResult(EmailDeliveryStatus.QUEUED, "msg-1"));
    when(emailRepository.findById(saved.getId())).thenReturn(Optional.of(saved));

    service.send(passwordReset(Map.of("resetUrl", RESET_URL), "reset-log"));

    String joined =
        logAppender.list.stream()
            .map(ILoggingEvent::getFormattedMessage)
            .reduce("", String::concat);
    assertThat(joined).doesNotContain(RECIPIENT);
    assertThat(joined).doesNotContain("secret-reset-token-xyz");
    assertThat(joined).doesNotContain(RESET_URL);
    assertThat(joined).doesNotContain("re_");
  }

  private void assertValidation(SendEmailCommand command) {
    assertThatThrownBy(() -> service.send(command))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getStatus(), ex -> ((ApiException) ex).getCode())
        .containsExactly(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR");
  }

  private static SendEmailCommand passwordReset(Map<String, String> variables, String key) {
    return new SendEmailCommand(
        EmailTemplate.PASSWORD_RESET, RECIPIENT, null, null, variables, key);
  }

  private static TransactionalEmail newRow(
      UUID tenantId, String key, EmailDeliveryStatus status, String providerId) {
    TransactionalEmail row = new TransactionalEmail();
    row.setId(UUID.randomUUID());
    row.setIdempotencyKey(key);
    row.setTenantId(tenantId);
    row.setTemplate(EmailTemplate.PASSWORD_RESET);
    row.setRecipient("owner@pharmacy.local");
    row.setProviderMessageId(providerId);
    row.setStatus(status);
    row.setCreatedAt(NOW);
    row.setUpdatedAt(NOW);
    return row;
  }
}
