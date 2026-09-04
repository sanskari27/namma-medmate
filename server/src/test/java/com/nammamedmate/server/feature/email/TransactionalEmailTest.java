package com.nammamedmate.server.feature.email;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.nammamedmate.server.AbstractIntegrationTest;
import com.nammamedmate.server.application.email.AdapterSendRequest;
import com.nammamedmate.server.application.email.AdapterSendResult;
import com.nammamedmate.server.application.email.SendEmailCommand;
import com.nammamedmate.server.application.email.SendEmailResult;
import com.nammamedmate.server.application.email.TransactionalEmailService;
import com.nammamedmate.server.domain.EmailDeliveryStatus;
import com.nammamedmate.server.domain.EmailTemplate;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TransactionalEmail;
import com.nammamedmate.server.infrastructure.email.ResendEmailAdapter;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.persistence.TransactionalEmailRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpStatus;

class TransactionalEmailTest extends AbstractIntegrationTest {

  private static final Instant T0 = Instant.parse("2026-09-01T08:00:00Z");

  @MockBean private ResendEmailAdapter resendEmailAdapter;

  @Autowired private TransactionalEmailService emailService;
  @Autowired private TransactionalEmailRepository emailRepository;
  @Autowired private TenantRepository tenantRepository;

  @BeforeEach
  void wipe() {
    emailRepository.deleteAll();
    tenantRepository.deleteAll();
  }

  @Test
  void ac02_validSendPersistsQueuedWithTenantScope() {
    Tenant tenant = persistTenant("email-pharma");
    when(resendEmailAdapter.send(any(AdapterSendRequest.class)))
        .thenReturn(new AdapterSendResult(EmailDeliveryStatus.QUEUED, "msg-1"));

    SendEmailResult result = emailService.send(passwordReset(tenant.getId(), "reset-once"));

    assertThat(result.status()).isEqualTo(EmailDeliveryStatus.QUEUED);
    assertThat(result.providerMessageId()).isEqualTo("msg-1");
    assertThat(result.replayed()).isFalse();
    TransactionalEmail stored =
        emailRepository.findByIdAndTenantId(result.id(), tenant.getId()).orElseThrow();
    assertThat(stored.getRecipient()).isEqualTo("owner@pharmacy.local");
    assertThat(stored.getStatus()).isEqualTo(EmailDeliveryStatus.QUEUED);
  }

  @Test
  void ac03_retryAfterQueuedReturnsSameMessageWithoutSecondSend() {
    Tenant tenant = persistTenant("retry-pharma");
    when(resendEmailAdapter.send(any(AdapterSendRequest.class)))
        .thenReturn(new AdapterSendResult(EmailDeliveryStatus.QUEUED, "msg-same"));

    SendEmailResult first = emailService.send(passwordReset(tenant.getId(), "reset-retry"));
    SendEmailResult second = emailService.send(passwordReset(tenant.getId(), "reset-retry"));

    assertThat(second.id()).isEqualTo(first.id());
    assertThat(second.providerMessageId()).isEqualTo("msg-same");
    assertThat(second.replayed()).isTrue();
    verify(resendEmailAdapter, times(1)).send(any(AdapterSendRequest.class));
  }

  @Test
  void ac03_transientFailureRetriesProvider() {
    Tenant tenant = persistTenant("transient-pharma");
    when(resendEmailAdapter.send(any(AdapterSendRequest.class)))
        .thenReturn(new AdapterSendResult(EmailDeliveryStatus.TRANSIENT_FAILURE, null))
        .thenReturn(new AdapterSendResult(EmailDeliveryStatus.QUEUED, "msg-2"));

    SendEmailResult first = emailService.send(passwordReset(tenant.getId(), "reset-transient"));
    SendEmailResult second = emailService.send(passwordReset(tenant.getId(), "reset-transient"));

    assertThat(first.status()).isEqualTo(EmailDeliveryStatus.TRANSIENT_FAILURE);
    assertThat(second.status()).isEqualTo(EmailDeliveryStatus.QUEUED);
    assertThat(second.providerMessageId()).isEqualTo("msg-2");
    verify(resendEmailAdapter, times(2)).send(any(AdapterSendRequest.class));
  }

  @Test
  void ac05_crossTenantSameKeyIsConflictWithoutDisclosure() {
    Tenant first = persistTenant("first-pharma");
    Tenant other = persistTenant("other-pharma");
    when(resendEmailAdapter.send(any(AdapterSendRequest.class)))
        .thenReturn(new AdapterSendResult(EmailDeliveryStatus.QUEUED, "msg-first"));

    emailService.send(passwordReset(first.getId(), "shared-key"));

    assertThatThrownBy(() -> emailService.send(passwordReset(other.getId(), "shared-key")))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getStatus(), ex -> ((ApiException) ex).getCode())
        .containsExactly(HttpStatus.CONFLICT, "IDEMPOTENCY_CONFLICT");
    assertThat(emailRepository.findByIdempotencyKey("shared-key").orElseThrow().getTenantId())
        .isEqualTo(first.getId());
  }

  @Test
  void ac02_providerFailureDoesNotThrowToCaller() {
    Tenant tenant = persistTenant("safe-pharma");
    when(resendEmailAdapter.send(any(AdapterSendRequest.class)))
        .thenReturn(new AdapterSendResult(EmailDeliveryStatus.TRANSIENT_FAILURE, null));

    SendEmailResult result = emailService.send(passwordReset(tenant.getId(), "reset-fail"));

    assertThat(result.status()).isEqualTo(EmailDeliveryStatus.TRANSIENT_FAILURE);
    assertThat(tenantRepository.findById(tenant.getId())).isPresent();
  }

  @Test
  void ac05_wrongTenantLookupDoesNotDiscloseRow() {
    Tenant tenant = persistTenant("owned-pharma");
    Tenant other = persistTenant("stranger-pharma");
    when(resendEmailAdapter.send(any(AdapterSendRequest.class)))
        .thenReturn(new AdapterSendResult(EmailDeliveryStatus.QUEUED, "msg-owned"));

    SendEmailResult result = emailService.send(passwordReset(tenant.getId(), "reset-owned"));

    assertThat(emailRepository.findByIdAndTenantId(result.id(), other.getId())).isEmpty();
    assertThat(emailRepository.findByIdAndTenantId(result.id(), tenant.getId())).isPresent();
  }

  private SendEmailCommand passwordReset(UUID tenantId, String key) {
    return new SendEmailCommand(
        EmailTemplate.PASSWORD_RESET,
        "Owner@Pharmacy.Local",
        tenantId,
        null,
        Map.of("resetUrl", "https://app.example/reset?t=abc"),
        key);
  }

  private Tenant persistTenant(String slug) {
    Tenant tenant = new Tenant();
    tenant.setId(UUID.randomUUID());
    tenant.setName(slug);
    tenant.setSlug(slug);
    tenant.setCreatedAt(T0);
    tenant.setUpdatedAt(T0);
    return tenantRepository.saveAndFlush(tenant);
  }
}
