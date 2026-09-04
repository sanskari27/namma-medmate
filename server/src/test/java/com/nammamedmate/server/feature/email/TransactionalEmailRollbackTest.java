package com.nammamedmate.server.feature.email;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.nammamedmate.server.AbstractIntegrationTest;
import com.nammamedmate.server.application.email.AdapterSendRequest;
import com.nammamedmate.server.application.email.SendEmailCommand;
import com.nammamedmate.server.application.email.TransactionalEmailService;
import com.nammamedmate.server.domain.EmailDeliveryStatus;
import com.nammamedmate.server.domain.EmailTemplate;
import com.nammamedmate.server.domain.Tenant;
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

class TransactionalEmailRollbackTest extends AbstractIntegrationTest {

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
  void ac02_adapterExceptionDoesNotRollBackCallerWrite() {
    Tenant tenant = persistTenant("caller-pharma");
    when(resendEmailAdapter.send(any(AdapterSendRequest.class)))
        .thenThrow(new IllegalStateException("sdk exploded"));

    var result =
        emailService.send(
            new SendEmailCommand(
                EmailTemplate.ONBOARDING,
                "owner@pharmacy.local",
                tenant.getId(),
                null,
                Map.of("verifyUrl", "https://app.example/verify?t=abc"),
                "onboard-boom"));

    assertThat(result.status()).isEqualTo(EmailDeliveryStatus.TRANSIENT_FAILURE);
    assertThat(tenantRepository.findById(tenant.getId())).isPresent();
    assertThat(emailRepository.findByIdempotencyKey("onboard-boom")).isPresent();
  }

  @Test
  void ac05_invalidRequestWritesNothing() {
    persistTenant("valid-pharma");

    assertThatThrownBy(
            () ->
                emailService.send(
                    new SendEmailCommand(
                        EmailTemplate.PASSWORD_RESET,
                        "owner@pharmacy.local",
                        null,
                        null,
                        Map.of("resetUrl", "https://app.example/reset"),
                        "  ")))
        .isInstanceOf(ApiException.class);

    assertThat(emailRepository.count()).isZero();
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
