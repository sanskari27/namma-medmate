package com.nammamedmate.server.infrastructure.whatsapp;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
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

  @FunctionalInterface
  public interface GraphSender {
    String send(String phoneNumberId, String toE164, String templateName);
  }

  private final GraphFetcher fetcher;
  private final GraphSender sender;
  private final String phoneNumberId;
  private final String displayNumber;

  @Autowired
  public MetaWhatsAppAdapter(
      @Value("${app.meta.whatsapp.token:}") String token,
      @Value("${app.meta.whatsapp.phone-number-id:}") String phoneNumberId,
      @Value("${app.meta.whatsapp.waba-id:}") String wabaId,
      @Value("${app.meta.whatsapp.display-number:}") String displayNumber) {
    this(fetcherFrom(token), senderFrom(token), phoneNumberId, displayNumber);
  }

  static MetaWhatsAppAdapter withFetcher(
      GraphFetcher fetcher, String phoneNumberId, String displayNumber) {
    return new MetaWhatsAppAdapter(fetcher, null, phoneNumberId, displayNumber);
  }

  static MetaWhatsAppAdapter withSender(
      GraphSender sender, String phoneNumberId, String displayNumber) {
    return new MetaWhatsAppAdapter(null, sender, phoneNumberId, displayNumber);
  }

  MetaWhatsAppAdapter(GraphFetcher fetcher, String phoneNumberId, String displayNumber) {
    this(fetcher, null, phoneNumberId, displayNumber);
  }

  MetaWhatsAppAdapter(
      GraphFetcher fetcher, GraphSender sender, String phoneNumberId, String displayNumber) {
    this.fetcher = fetcher;
    this.sender = sender;
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

  public MetaSendResult sendTemplate(
      String toE164, String templateName, Map<String, String> variables) {
    if (sender == null) {
      log.info("meta whatsapp send skipped");
      return MetaSendResult.unavailable();
    }
    if (toE164 == null || toE164.isBlank() || templateName == null || templateName.isBlank()) {
      return MetaSendResult.unavailable();
    }
    try {
      String id = sender.send(phoneNumberId, toE164, templateName);
      return MetaSendResult.sent(id == null || id.isBlank() ? "wamid.local" : id);
    } catch (RuntimeException ex) {
      log.info("meta whatsapp send failed");
      throw ex;
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

  private static GraphSender senderFrom(String token) {
    if (token == null || token.isBlank()) {
      return null;
    }
    RestClient client = RestClient.create();
    return (id, to, name) -> {
      try {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("messaging_product", "whatsapp");
        body.put("to", to);
        body.put("type", "template");
        Map<String, Object> template = new LinkedHashMap<>();
        template.put("name", name);
        template.put("language", Map.of("code", "en"));
        body.put("template", template);
        JsonNode response =
            client
                .post()
                .uri("https://graph.facebook.com/v21.0/{id}/messages", id)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(JsonNode.class);
        if (response != null
            && response.path("messages").isArray()
            && response.path("messages").size() > 0) {
          return response.path("messages").get(0).path("id").asText("wamid.local");
        }
        return "wamid.local";
      } catch (RestClientException ex) {
        throw new IllegalStateException("graph send failed", ex);
      }
    };
  }
}
