package com.nammamedmate.server.infrastructure.email;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.nammamedmate.server.application.email.AdapterSendRequest;
import com.nammamedmate.server.application.email.AdapterSendResult;
import com.nammamedmate.server.domain.EmailDeliveryStatus;
import com.resend.core.exception.ResendException;
import com.resend.core.net.RequestOptions;
import com.resend.services.emails.model.CreateEmailOptions;
import com.resend.services.emails.model.CreateEmailResponse;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.slf4j.LoggerFactory;

@ExtendWith(MockitoExtension.class)
class ResendEmailAdapterTest {

  private static final String FROM = "Namma MedMate <beth.t@example.com>";
  private static final String API_KEY = "re_test_live_key_must_not_appear_in_logs";

  @Mock private ResendEmailAdapter.Sender sender;

  private ListAppender<ILoggingEvent> logAppender;
  private Logger logger;

  @BeforeEach
  void setUp() {
    logger = (Logger) LoggerFactory.getLogger(ResendEmailAdapter.class);
    logAppender = new ListAppender<>();
    logAppender.start();
    logger.addAppender(logAppender);
  }

  @AfterEach
  void tearDown() {
    logger.detachAppender(logAppender);
  }

  @Test
  void ac02_successIsQueuedAndSendsIdempotencyKey() throws Exception {
    when(sender.send(any(CreateEmailOptions.class), any(RequestOptions.class)))
        .thenReturn(new CreateEmailResponse("msg-queued-1"));
    ResendEmailAdapter adapter = ResendEmailAdapter.withSender(sender, FROM);

    AdapterSendResult result = adapter.send(request());

    assertThat(result.status()).isEqualTo(EmailDeliveryStatus.QUEUED);
    assertThat(result.providerMessageId()).isEqualTo("msg-queued-1");
    ArgumentCaptor<RequestOptions> options = ArgumentCaptor.forClass(RequestOptions.class);
    verify(sender).send(any(CreateEmailOptions.class), options.capture());
    assertThat(options.getValue().getIdempotencyKey()).isEqualTo("reset-1");
  }

  @Test
  void ac02_rateLimitIsTransientFailure() throws Exception {
    when(sender.send(any(), any())).thenThrow(new ResendException(429, "{\"message\":\"slow\"}"));
    ResendEmailAdapter adapter = ResendEmailAdapter.withSender(sender, FROM);

    AdapterSendResult result = adapter.send(request());

    assertThat(result.status()).isEqualTo(EmailDeliveryStatus.TRANSIENT_FAILURE);
    assertThat(result.providerMessageId()).isNull();
  }

  @Test
  void ac02_serverErrorIsTransientFailure() throws Exception {
    when(sender.send(any(), any())).thenThrow(new ResendException(500, "{\"message\":\"boom\"}"));
    ResendEmailAdapter adapter = ResendEmailAdapter.withSender(sender, FROM);

    assertThat(adapter.send(request()).status()).isEqualTo(EmailDeliveryStatus.TRANSIENT_FAILURE);
  }

  @Test
  void ac02_unprocessableIsPermanentFailure() throws Exception {
    when(sender.send(any(), any()))
        .thenThrow(new ResendException(422, "{\"message\":\"invalid to\"}"));
    ResendEmailAdapter adapter = ResendEmailAdapter.withSender(sender, FROM);

    assertThat(adapter.send(request()).status()).isEqualTo(EmailDeliveryStatus.PERMANENT_FAILURE);
  }

  @Test
  void ac02_missingApiKeyIsTransientWithoutSdkCall() throws Exception {
    ResendEmailAdapter adapter = new ResendEmailAdapter("", FROM);

    AdapterSendResult result = adapter.send(request());

    assertThat(result.status()).isEqualTo(EmailDeliveryStatus.TRANSIENT_FAILURE);
    verify(sender, never()).send(any(), any());
  }

  @Test
  void ac04_logsOmitApiKeyRecipientAndHtml() throws Exception {
    when(sender.send(any(), any())).thenReturn(new CreateEmailResponse("msg-queued-1"));
    ResendEmailAdapter adapter = ResendEmailAdapter.withSender(sender, FROM);

    adapter.send(
        new AdapterSendRequest(
            "owner@pharmacy.local",
            "Reset your Namma MedMate password",
            "<p>https://app.example/reset?t=secret-reset-token-xyz</p>",
            "reset-1"));

    String joined =
        logAppender.list.stream()
            .map(ILoggingEvent::getFormattedMessage)
            .reduce("", String::concat);
    assertThat(joined).doesNotContain(API_KEY);
    assertThat(joined).doesNotContain("owner@pharmacy.local");
    assertThat(joined).doesNotContain("secret-reset-token-xyz");
    assertThat(joined).doesNotContain("<p>");
  }

  private static AdapterSendRequest request() {
    return new AdapterSendRequest(
        "owner@pharmacy.local", "Reset your Namma MedMate password", "<p>reset</p>", "reset-1");
  }
}
