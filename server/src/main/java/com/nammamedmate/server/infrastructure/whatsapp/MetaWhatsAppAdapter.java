package com.nammamedmate.server.infrastructure.whatsapp;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Component
public class MetaWhatsAppAdapter {

  private static final Logger log = LoggerFactory.getLogger(MetaWhatsAppAdapter.class);

  @FunctionalInterface
  public interface GraphFetcher {
    void ping(String phoneNumberId);
  }

  private final GraphFetcher fetcher;
  private final String phoneNumberId;
  private final String displayNumber;

  @Autowired
  public MetaWhatsAppAdapter(
      @Value("${app.meta.whatsapp.token:}") String token,
      @Value("${app.meta.whatsapp.phone-number-id:}") String phoneNumberId,
      @Value("${app.meta.whatsapp.waba-id:}") String wabaId,
      @Value("${app.meta.whatsapp.display-number:}") String displayNumber) {
    this(fetcherFrom(token), phoneNumberId, displayNumber);
  }

  static MetaWhatsAppAdapter withFetcher(
      GraphFetcher fetcher, String phoneNumberId, String displayNumber) {
    return new MetaWhatsAppAdapter(fetcher, phoneNumberId, displayNumber);
  }

  MetaWhatsAppAdapter(GraphFetcher fetcher, String phoneNumberId, String displayNumber) {
    this.fetcher = fetcher;
    this.phoneNumberId = phoneNumberId == null ? "" : phoneNumberId;
    this.displayNumber = displayNumber == null ? "" : displayNumber;
  }

  public MetaProviderSnapshot fetchStatus() {
    if (fetcher == null) {
      log.info("meta whatsapp sync skipped");
      return new MetaProviderSnapshot(displayNumber, phoneNumberId, "NOT_CONFIGURED");
    }
    try {
      fetcher.ping(phoneNumberId);
      return new MetaProviderSnapshot(displayNumber, phoneNumberId, "UP");
    } catch (RuntimeException ex) {
      log.info("meta whatsapp ping failed");
      return new MetaProviderSnapshot(displayNumber, phoneNumberId, "UNAVAILABLE");
    }
  }

  private static GraphFetcher fetcherFrom(String token) {
    if (token == null || token.isBlank()) {
      return null;
    }
    RestClient client = RestClient.create();
    return id -> {
      try {
        client
            .get()
            .uri("https://graph.facebook.com/v21.0/{id}", id)
            .header("Authorization", "Bearer " + token)
            .retrieve()
            .toBodilessEntity();
      } catch (RestClientException ex) {
        throw new IllegalStateException("graph ping failed", ex);
      }
    };
  }
}
