package com.nammamedmate.server.application.email;

import com.nammamedmate.server.domain.EmailDeliveryStatus;
import com.nammamedmate.server.domain.TransactionalEmail;
import com.nammamedmate.server.persistence.TransactionalEmailRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.time.Clock;
import java.time.Instant;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ResendWebhookService {

  private final TransactionalEmailRepository emailRepository;
  private final Clock clock;

  public ResendWebhookService(TransactionalEmailRepository emailRepository, Clock clock) {
    this.emailRepository = emailRepository;
    this.clock = clock;
  }

  @Transactional
  public EmailDeliveryStatus apply(String type, String providerMessageId) {
    TransactionalEmail row =
        emailRepository
            .findByProviderMessageId(providerMessageId)
            .orElseThrow(
                () -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Email not found"));
    if (row.getStatus() != EmailDeliveryStatus.QUEUED) {
      return row.getStatus();
    }
    EmailDeliveryStatus next =
        switch (type) {
          case "email.sent", "email.delivered" -> EmailDeliveryStatus.SENT;
          case "email.bounced", "email.failed", "email.complained" ->
              EmailDeliveryStatus.PERMANENT_FAILURE;
          default -> row.getStatus();
        };
    if (next != row.getStatus()) {
      row.setStatus(next);
      row.setUpdatedAt(Instant.now(clock));
      emailRepository.save(row);
    }
    return next;
  }
}
