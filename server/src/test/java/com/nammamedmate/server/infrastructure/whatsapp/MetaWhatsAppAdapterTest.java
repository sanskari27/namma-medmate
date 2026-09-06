package com.nammamedmate.server.infrastructure.whatsapp;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import java.util.Map;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.slf4j.LoggerFactory;

@ExtendWith(MockitoExtension.class)
class MetaWhatsAppAdapterTest {

  private static final String TOKEN = "meta-live-token-must-not-appear";

  @Mock private MetaWhatsAppAdapter.GraphFetcher fetcher;
  @Mock private MetaWhatsAppAdapter.GraphSender sender;

  private ListAppender<ILoggingEvent> logAppender;
  private Logger logger;

  @BeforeEach
  void setUp() {
    logger = (Logger) LoggerFactory.getLogger(MetaWhatsAppAdapter.class);
    logAppender = new ListAppender<>();
    logAppender.start();
    logger.addAppender(logAppender);
  }

  @AfterEach
  void tearDown() {
    logger.detachAppender(logAppender);
  }

  @Test
  void blankTokenSkipsGraphAndOmitsSecret() {
    MetaWhatsAppAdapter adapter =
        new MetaWhatsAppAdapter("", "phone-1", "waba-1", "+91 90000 00000");

    MetaProviderSnapshot snapshot = adapter.fetchStatus();

    assertThat(snapshot.health()).isEqualTo("NOT_CONFIGURED");
    assertThat(snapshot.displayNumber()).isEqualTo("+91 90000 00000");
    assertThat(snapshot.phoneNumberId()).isEqualTo("phone-1");
    verify(fetcher, never()).ping(org.mockito.ArgumentMatchers.any());
    String joined =
        logAppender.list.stream()
            .map(ILoggingEvent::getFormattedMessage)
            .reduce("", String::concat);
    assertThat(joined).doesNotContain(TOKEN);
  }

  @Test
  void configuredFetcherMarksUpWithoutLoggingToken() {
    MetaWhatsAppAdapter adapter =
        MetaWhatsAppAdapter.withFetcher(fetcher, "phone-1", "+91 90000 00000");

    MetaProviderSnapshot snapshot = adapter.fetchStatus();

    assertThat(snapshot.health()).isEqualTo("UP");
    String joined =
        logAppender.list.stream()
            .map(ILoggingEvent::getFormattedMessage)
            .reduce("", String::concat);
    assertThat(joined).doesNotContain(TOKEN);
  }

  @Test
  void blankTokenSkipsSendAndOmitsSecret() {
    MetaWhatsAppAdapter adapter =
        new MetaWhatsAppAdapter("", "phone-1", "waba-1", "+91 90000 00000");

    MetaSendResult result =
        adapter.sendTemplate("919876500001", "tenant_refill_due", Map.of("customer_name", "Ravi"));

    assertThat(result.sent()).isFalse();
    assertThat(result.failureCode()).isEqualTo("PROVIDER_UNAVAILABLE");
    verify(sender, never())
        .send(
            org.mockito.ArgumentMatchers.any(),
            org.mockito.ArgumentMatchers.any(),
            org.mockito.ArgumentMatchers.any());
    String joined =
        logAppender.list.stream()
            .map(ILoggingEvent::getFormattedMessage)
            .reduce("", String::concat);
    assertThat(joined).doesNotContain(TOKEN);
    assertThat(joined).doesNotContain("919876500001");
    assertThat(joined).doesNotContain("Ravi");
    assertThat(joined.toLowerCase()).doesNotContain("sms");
  }

  @Test
  void sendUsesSenderWithoutLoggingTokenOrSms() {
    when(sender.send("phone-1", "919876500001", "tenant_campaign")).thenReturn("wamid.9");
    MetaWhatsAppAdapter adapter =
        MetaWhatsAppAdapter.withSender(sender, "phone-1", "+91 90000 00000");

    MetaSendResult result =
        adapter.sendTemplate("919876500001", "tenant_campaign", Map.of("customer_name", "Ravi"));

    assertThat(result.sent()).isTrue();
    assertThat(result.providerMessageId()).isEqualTo("wamid.9");
    String joined =
        logAppender.list.stream()
            .map(ILoggingEvent::getFormattedMessage)
            .reduce("", String::concat);
    assertThat(joined).doesNotContain(TOKEN);
    assertThat(joined).doesNotContain("919876500001");
    assertThat(joined.toLowerCase()).doesNotContain("sms");
  }
}
