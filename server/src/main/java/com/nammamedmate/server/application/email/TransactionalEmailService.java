package com.nammamedmate.server.application.email;

import com.nammamedmate.server.domain.EmailDeliveryStatus;
import com.nammamedmate.server.domain.EmailNormalizer;
import com.nammamedmate.server.domain.EmailTemplate;
import com.nammamedmate.server.domain.EmailTemplateRenderer;
import com.nammamedmate.server.domain.RenderedEmail;
import com.nammamedmate.server.domain.TransactionalEmail;
import com.nammamedmate.server.infrastructure.email.ResendEmailAdapter;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.persistence.TransactionalEmailRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.time.Clock;
import java.time.Instant;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class TransactionalEmailService {

  private static final Logger log = LoggerFactory.getLogger(TransactionalEmailService.class);

  private final TransactionalEmailRepository emailRepository;
  private final TenantRepository tenantRepository;
  private final ResendEmailAdapter resendEmailAdapter;
  private final Clock clock;
  private final TransactionTemplate requiresNew;

  @Autowired
  public TransactionalEmailService(
      TransactionalEmailRepository emailRepository,
      TenantRepository tenantRepository,
      ResendEmailAdapter resendEmailAdapter,
      Clock clock,
      PlatformTransactionManager transactionManager) {
    this.emailRepository = emailRepository;
    this.tenantRepository = tenantRepository;
    this.resendEmailAdapter = resendEmailAdapter;
    this.clock = clock;
    this.requiresNew = new TransactionTemplate(transactionManager);
    this.requiresNew.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
  }

  TransactionalEmailService(
      TransactionalEmailRepository emailRepository,
      TenantRepository tenantRepository,
      ResendEmailAdapter resendEmailAdapter,
      Clock clock) {
    this.emailRepository = emailRepository;
    this.tenantRepository = tenantRepository;
    this.resendEmailAdapter = resendEmailAdapter;
    this.clock = clock;
    this.requiresNew = null;
  }

  public SendEmailResult send(SendEmailCommand command) {
    ValidatedRequest request = validate(command);
    Optional<TransactionalEmail> existing =
        emailRepository.findByIdempotencyKey(request.idempotencyKey());
    if (existing.isPresent()) {
      TransactionalEmail row = existing.get();
      if (!Objects.equals(row.getTenantId(), request.tenantId())) {
        throw new ApiException(
            HttpStatus.CONFLICT, "IDEMPOTENCY_CONFLICT", "Idempotency key already used");
      }
      if (row.getStatus() != EmailDeliveryStatus.TRANSIENT_FAILURE) {
        log.info(
            "transactional email {} template={} status={}",
            row.getId(),
            row.getTemplate(),
            row.getStatus());
        return toResult(row, true);
      }
      return deliver(row, request.rendered());
    }
    TransactionalEmail created;
    try {
      created = persistNew(request);
    } catch (DataIntegrityViolationException ex) {
      TransactionalEmail raced =
          emailRepository.findByIdempotencyKey(request.idempotencyKey()).orElseThrow(() -> ex);
      if (!Objects.equals(raced.getTenantId(), request.tenantId())) {
        throw new ApiException(
            HttpStatus.CONFLICT, "IDEMPOTENCY_CONFLICT", "Idempotency key already used");
      }
      return toResult(raced, true);
    }
    return deliver(created, request.rendered());
  }

  private SendEmailResult deliver(TransactionalEmail row, RenderedEmail rendered) {
    AdapterSendResult adapterResult;
    try {
      adapterResult =
          resendEmailAdapter.send(
              new AdapterSendRequest(
                  row.getRecipient(),
                  rendered.subject(),
                  rendered.html(),
                  row.getIdempotencyKey()));
    } catch (RuntimeException ex) {
      log.info(
          "transactional email {} template={} status={}",
          row.getId(),
          row.getTemplate(),
          EmailDeliveryStatus.TRANSIENT_FAILURE);
      adapterResult = new AdapterSendResult(EmailDeliveryStatus.TRANSIENT_FAILURE, null);
    }
    TransactionalEmail updated = persistStatus(row.getId(), adapterResult);
    log.info(
        "transactional email {} template={} status={}",
        updated.getId(),
        updated.getTemplate(),
        updated.getStatus());
    return toResult(updated, false);
  }

  private TransactionalEmail persistNew(ValidatedRequest request) {
    Instant now = Instant.now(clock);
    TransactionalEmail row = new TransactionalEmail();
    row.setId(UUID.randomUUID());
    row.setIdempotencyKey(request.idempotencyKey());
    row.setTenantId(request.tenantId());
    row.setTemplate(request.template());
    row.setRecipient(request.recipient());
    row.setStatus(EmailDeliveryStatus.TRANSIENT_FAILURE);
    row.setCreatedAt(now);
    row.setUpdatedAt(now);
    if (requiresNew == null) {
      return emailRepository.save(row);
    }
    return requiresNew.execute(status -> emailRepository.save(row));
  }

  private TransactionalEmail persistStatus(UUID id, AdapterSendResult adapterResult) {
    if (requiresNew == null) {
      return applyStatus(id, adapterResult);
    }
    return requiresNew.execute(status -> applyStatus(id, adapterResult));
  }

  private TransactionalEmail applyStatus(UUID id, AdapterSendResult adapterResult) {
    TransactionalEmail stored = emailRepository.findById(id).orElseThrow();
    stored.setStatus(adapterResult.status());
    if (adapterResult.providerMessageId() != null) {
      stored.setProviderMessageId(adapterResult.providerMessageId());
    }
    stored.setUpdatedAt(Instant.now(clock));
    return emailRepository.save(stored);
  }

  private ValidatedRequest validate(SendEmailCommand command) {
    if (command == null || command.template() == null) {
      throw validation();
    }
    String key = command.idempotencyKey() == null ? "" : command.idempotencyKey().trim();
    if (key.isEmpty() || key.length() > 128) {
      throw validation();
    }
    String recipient = EmailNormalizer.normalize(command.recipient());
    if (!validRecipient(recipient)) {
      throw validation();
    }
    Map<String, String> variables = command.variables() == null ? Map.of() : command.variables();
    Set<String> expected = command.template().variableKeys();
    if (!variables.keySet().equals(expected)) {
      throw validation();
    }
    for (String name : expected) {
      String value = variables.get(name);
      if (value == null || value.isBlank()) {
        throw validation();
      }
    }
    if (command.tenantId() != null && !tenantRepository.existsById(command.tenantId())) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY, "TENANT_NOT_FOUND", "Tenant not found");
    }
    RenderedEmail rendered =
        EmailTemplateRenderer.render(command.template(), command.pharmacyName(), variables);
    return new ValidatedRequest(command.template(), recipient, command.tenantId(), key, rendered);
  }

  private static boolean validRecipient(String email) {
    if (email == null || email.isBlank()) {
      return false;
    }
    int at = email.indexOf('@');
    return at > 0
        && at < email.length() - 1
        && email.indexOf('@', at + 1) < 0
        && email.indexOf('.', at) > at + 1;
  }

  private static ApiException validation() {
    return new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
  }

  private static SendEmailResult toResult(TransactionalEmail row, boolean replayed) {
    return new SendEmailResult(row.getId(), row.getStatus(), row.getProviderMessageId(), replayed);
  }

  private record ValidatedRequest(
      EmailTemplate template,
      String recipient,
      UUID tenantId,
      String idempotencyKey,
      RenderedEmail rendered) {}
}
