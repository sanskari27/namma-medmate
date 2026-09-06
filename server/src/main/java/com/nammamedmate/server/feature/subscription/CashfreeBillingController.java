package com.nammamedmate.server.feature.subscription;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nammamedmate.server.application.subscription.CashfreeBillingService;
import com.nammamedmate.server.application.subscription.CashfreeCallbackCommand;
import com.nammamedmate.server.application.subscription.CashfreePaymentView;
import com.nammamedmate.server.domain.CashfreeBillingPolicy;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.infrastructure.cashfree.CashfreeWebhookSignature;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.shared.exception.ApiException;
import com.nammamedmate.server.shared.web.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/subscriptions/payments/cashfree")
public class CashfreeBillingController {

  private final CashfreeBillingService cashfreeBillingService;
  private final ObjectMapper objectMapper;
  private final String webhookSecret;

  public CashfreeBillingController(
      CashfreeBillingService cashfreeBillingService,
      ObjectMapper objectMapper,
      @Value("${app.cashfree.webhook-secret:}") String webhookSecret) {
    this.cashfreeBillingService = cashfreeBillingService;
    this.objectMapper = objectMapper;
    this.webhookSecret = webhookSecret;
  }

  @PostMapping
  public ApiResponse<CashfreePaymentResponse> checkout(
      Authentication authentication, @Valid @RequestBody CheckoutRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toResponse(
            cashfreeBillingService.checkout(
                principal, request.planCode(), request.idempotencyKey())));
  }

  @GetMapping("/{id}")
  public ApiResponse<CashfreePaymentResponse> status(
      Authentication authentication, @PathVariable UUID id) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toResponse(cashfreeBillingService.reconcile(principal, id)));
  }

  @GetMapping
  public ApiResponse<CashfreePaymentResponse> statusByOrder(
      Authentication authentication,
      @org.springframework.web.bind.annotation.RequestParam String orderId) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toResponse(cashfreeBillingService.reconcileByOrder(principal, orderId)));
  }

  @PostMapping(path = "/callback", consumes = MediaType.APPLICATION_JSON_VALUE)
  public ApiResponse<CallbackAckResponse> callback(
      @RequestHeader(value = "x-webhook-timestamp", required = false) String timestamp,
      @RequestHeader(value = "x-webhook-signature", required = false) String signature,
      @RequestBody String body) {
    if (!CashfreeWebhookSignature.valid(webhookSecret, timestamp, body, signature)) {
      throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Authentication required");
    }
    JsonNode json;
    try {
      json = objectMapper.readTree(body);
    } catch (Exception ex) {
      throw CashfreeBillingPolicy.shape();
    }
    JsonNode order = json.path("data").path("order");
    JsonNode payment = json.path("data").path("payment");
    JsonNode tags = order.path("order_tags");
    var view =
        cashfreeBillingService.applyCallback(
            new CashfreeCallbackCommand(
                text(json, "type"),
                text(order, "order_id"),
                amount(order),
                text(payment, "cf_payment_id"),
                uuid(tags, "tenant_id"),
                text(tags, "plan_code"),
                body));
    if (CashfreeBillingPolicy.AMOUNT_MISMATCH.equals(view.errorCode())) {
      throw CashfreeBillingPolicy.amountMismatch();
    }
    if (CashfreeBillingPolicy.TENANT_MISMATCH.equals(view.errorCode())) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          CashfreeBillingPolicy.TENANT_MISMATCH,
          "This checkout does not belong to that pharmacy.");
    }
    return ApiResponse.ok(new CallbackAckResponse("accepted"));
  }

  private static CashfreePaymentResponse toResponse(CashfreePaymentView view) {
    return new CashfreePaymentResponse(
        view.id(),
        view.tenantId(),
        view.planCode().name(),
        view.amountPaise(),
        view.status().name(),
        view.checkoutUrl(),
        view.providerOrderId(),
        view.errorCode(),
        view.createdAt());
  }

  private static String text(JsonNode json, String field) {
    JsonNode node = json.get(field);
    return node == null || node.isNull() ? null : node.asText();
  }

  private static UUID uuid(JsonNode json, String field) {
    String value = text(json, field);
    if (value == null || value.isBlank()) {
      return null;
    }
    try {
      return UUID.fromString(value);
    } catch (IllegalArgumentException ex) {
      return null;
    }
  }

  private static BigDecimal amount(JsonNode order) {
    JsonNode node = order.get("order_amount");
    if (node == null || node.isNull() || node.asText().isBlank()) {
      return null;
    }
    try {
      return new BigDecimal(node.asText());
    } catch (NumberFormatException ex) {
      return null;
    }
  }

  public record CheckoutRequest(@NotNull PlanCode planCode, @NotBlank String idempotencyKey) {}

  public record CashfreePaymentResponse(
      UUID id,
      UUID tenantId,
      String planCode,
      int amountPaise,
      String status,
      String checkoutUrl,
      String providerOrderId,
      String errorCode,
      Instant createdAt) {}

  public record CallbackAckResponse(String status) {}
}
