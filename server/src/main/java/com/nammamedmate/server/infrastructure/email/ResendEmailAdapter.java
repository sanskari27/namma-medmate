package com.nammamedmate.server.infrastructure.email;

import com.nammamedmate.server.application.email.AdapterSendRequest;
import com.nammamedmate.server.application.email.AdapterSendResult;
import com.nammamedmate.server.domain.EmailDeliveryStatus;
import com.resend.Resend;
import com.resend.core.exception.ResendException;
import com.resend.core.net.RequestOptions;
import com.resend.services.emails.model.CreateEmailOptions;
import com.resend.services.emails.model.CreateEmailResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class ResendEmailAdapter {

  private static final Logger log = LoggerFactory.getLogger(ResendEmailAdapter.class);

  @FunctionalInterface
  public interface Sender {
    CreateEmailResponse send(CreateEmailOptions options, RequestOptions requestOptions)
        throws ResendException;
  }

  private final Sender sender;
  private final String from;

  @Autowired
  public ResendEmailAdapter(
      @Value("${app.resend.api-key:}") String apiKey,
      @Value("${app.resend.from:Namma MedMate <beth.t@example.com>}") String from) {
    this(senderFrom(apiKey), from);
  }

  static ResendEmailAdapter withSender(Sender sender, String from) {
    return new ResendEmailAdapter(sender, from);
  }

  private ResendEmailAdapter(Sender sender, String from) {
    this.sender = sender;
    this.from = from;
  }

  public AdapterSendResult send(AdapterSendRequest request) {
    if (sender == null) {
      log.info("resend send skipped");
      return new AdapterSendResult(EmailDeliveryStatus.TRANSIENT_FAILURE, null);
    }
    try {
      CreateEmailOptions options =
          CreateEmailOptions.builder()
              .from(from)
              .to(request.recipient())
              .subject(request.subject())
              .html(request.html())
              .build();
      RequestOptions requestOptions =
          RequestOptions.builder().setIdempotencyKey(request.idempotencyKey()).build();
      CreateEmailResponse response = sender.send(options, requestOptions);
      log.info("resend send status={}", EmailDeliveryStatus.QUEUED);
      return new AdapterSendResult(EmailDeliveryStatus.QUEUED, response.getId());
    } catch (ResendException ex) {
      EmailDeliveryStatus status = map(ex.getStatusCode());
      log.info("resend send failed statusCode={}", ex.getStatusCode());
      return new AdapterSendResult(status, null);
    }
  }

  private static EmailDeliveryStatus map(Integer statusCode) {
    if (statusCode == null || statusCode == 429 || statusCode >= 500) {
      return EmailDeliveryStatus.TRANSIENT_FAILURE;
    }
    if (statusCode >= 400) {
      return EmailDeliveryStatus.PERMANENT_FAILURE;
    }
    return EmailDeliveryStatus.TRANSIENT_FAILURE;
  }

  private static Sender senderFrom(String apiKey) {
    if (apiKey == null || apiKey.isBlank()) {
      return null;
    }
    Resend client = new Resend(apiKey);
    return (options, requestOptions) -> client.emails().send(options, requestOptions);
  }
}
