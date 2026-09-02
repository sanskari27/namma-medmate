package com.nammamedmate.server.feature.integrations;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nammamedmate.server.application.email.ResendWebhookService;
import com.nammamedmate.server.infrastructure.email.ResendWebhookSignature;
import com.nammamedmate.server.shared.exception.ApiException;
import com.nammamedmate.server.shared.web.ApiResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/integrations/resend")
public class ResendWebhookController {

  private final ResendWebhookService webhookService;
  private final ObjectMapper objectMapper;
  private final String webhookSecret;

  public ResendWebhookController(
      ResendWebhookService webhookService,
      ObjectMapper objectMapper,
      @Value("${app.resend.webhook-secret:}") String webhookSecret) {
    this.webhookService = webhookService;
    this.objectMapper = objectMapper;
    this.webhookSecret = webhookSecret;
  }

  @PostMapping(path = "/webhook", consumes = MediaType.APPLICATION_JSON_VALUE)
  public ApiResponse<ResendWebhookAckResponse> receive(
      @RequestHeader(value = "svix-id", required = false) String svixId,
      @RequestHeader(value = "svix-timestamp", required = false) String timestamp,
      @RequestHeader(value = "svix-signature", required = false) String signature,
      @RequestBody String body) {
    if (!ResendWebhookSignature.valid(webhookSecret, svixId, timestamp, body, signature)) {
      throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Authentication required");
    }
    JsonNode json;
    try {
      json = objectMapper.readTree(body);
    } catch (Exception ex) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
    String type = text(json, "type");
    String emailId = json.path("data").path("email_id").asText(null);
    if (type == null || type.isBlank() || emailId == null || emailId.isBlank()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
    webhookService.apply(type, emailId);
    return ApiResponse.ok(new ResendWebhookAckResponse("accepted"));
  }

  private static String text(JsonNode json, String field) {
    JsonNode node = json.get(field);
    return node == null || node.isNull() ? null : node.asText();
  }
}
