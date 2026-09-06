package com.nammamedmate.server.infrastructure.whatsapp;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
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
}
