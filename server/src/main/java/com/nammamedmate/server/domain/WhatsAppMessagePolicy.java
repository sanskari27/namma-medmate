package com.nammamedmate.server.domain;

import com.nammamedmate.server.shared.exception.ApiException;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;

public final class WhatsAppMessagePolicy {

  public static final String CHANNEL = "WHATSAPP";
  public static final String REFILL_TEMPLATE = "refill_due";
  public static final String CREDIT_TEMPLATE = "credit_due";
  public static final String CAMPAIGN_TEMPLATE = "campaign";
  public static final String INVALID_PHONE = "INVALID_PHONE";
  public static final String UNAPPROVED_TEMPLATE = "UNAPPROVED_TEMPLATE";
  public static final String PROVIDER_UNAVAILABLE = "PROVIDER_UNAVAILABLE";
  public static final String NOT_READY = "NOT_READY";
  public static final String FORBIDDEN = "FORBIDDEN";
  public static final String NOT_FOUND = "NOT_FOUND";
  public static final String EMPTY_AUDIENCE = "EMPTY_AUDIENCE";
  public static final String AUDIT_SEND = "WHATSAPP_MESSAGE_SEND";
  public static final String AUDIT_RETRY = "WHATSAPP_MESSAGE_RETRY";
  public static final Set<String> SENDABLE_TEMPLATES =
      Set.of(REFILL_TEMPLATE, CREDIT_TEMPLATE, CAMPAIGN_TEMPLATE);

  private WhatsAppMessagePolicy() {}

  public static void requireSendableTemplate(String uniqueName) {
    if (uniqueName == null || !SENDABLE_TEMPLATES.contains(uniqueName)) {
      throw unapproved();
    }
  }

  public static void requireApproved(WhatsAppApprovalStatus status, boolean namespaced) {
    if (!namespaced || status != WhatsAppApprovalStatus.APPROVED) {
      throw unapproved();
    }
  }

  public static void requireReady(CampaignStatus status) {
    if (status != CampaignStatus.READY_FOR_DELIVERY) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          NOT_READY,
          "Freeze this list before sending the shop update.");
    }
  }

  public static void requireAudience(int size) {
    if (size <= 0) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          EMPTY_AUDIENCE,
          "This frozen list has no patients to send.");
    }
  }

  public static void rejectSms(String channel) {
    if (channel != null && channel.toUpperCase().contains("SMS")) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          "SMS_NOT_SUPPORTED",
          "WhatsApp is the only customer message channel.");
    }
  }

  public static String requirePhone(String raw) {
    if (raw == null || raw.isBlank()) {
      throw invalidPhone();
    }
    String digits = raw.replaceAll("\\D", "");
    if (digits.length() == 12 && digits.startsWith("91")) {
      digits = digits.substring(2);
    }
    if (digits.length() != 10) {
      throw invalidPhone();
    }
    return digits;
  }

  public static boolean validPhone(String raw) {
    try {
      requirePhone(raw);
      return true;
    } catch (ApiException ex) {
      return false;
    }
  }

  public static String graphAddress(String tenDigit) {
    return "91" + tenDigit;
  }

  public static String refillKey(UUID scheduleId, LocalDate dueOn) {
    return "refill:" + scheduleId + ":" + dueOn;
  }

  public static String creditKey(UUID accountId, LocalDate day) {
    return "credit:" + accountId + ":" + day;
  }

  public static String campaignKey(UUID campaignId, UUID customerId) {
    return "campaign:" + campaignId + ":" + customerId;
  }

  public static Map<String, String> mergeVariables(
      Map<String, String> tenant, Map<String, String> runtime) {
    Map<String, String> merged = new LinkedHashMap<>();
    if (tenant != null) {
      merged.putAll(tenant);
    }
    if (runtime != null) {
      merged.putAll(runtime);
    }
    return merged;
  }

  public static ApiException unapproved() {
    return new ApiException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        UNAPPROVED_TEMPLATE,
        "This WhatsApp template is not approved for this pharmacy.");
  }

  public static ApiException invalidPhone() {
    return new ApiException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        INVALID_PHONE,
        "This patient phone cannot be used for WhatsApp.");
  }

  public static ApiException forbidden() {
    return new ApiException(HttpStatus.FORBIDDEN, FORBIDDEN, "Forbidden");
  }

  public static ApiException notFound() {
    return new ApiException(HttpStatus.NOT_FOUND, NOT_FOUND, "WhatsApp send was not found.");
  }

  public static ApiException shape() {
    return new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
  }
}
