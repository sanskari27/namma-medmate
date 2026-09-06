package com.nammamedmate.server.domain;

import com.nammamedmate.server.shared.exception.ApiException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;

public final class CampaignPolicy {

  public static final String FORBIDDEN = "FORBIDDEN";
  public static final String NOT_FOUND = "NOT_FOUND";
  public static final String UNAPPROVED_TEMPLATE = "UNAPPROVED_TEMPLATE";
  public static final String UNKNOWN_VARIABLE = "UNKNOWN_VARIABLE";
  public static final String EMPTY_AUDIENCE = "EMPTY_AUDIENCE";
  public static final String READY_ALREADY = "READY_ALREADY";
  public static final String PREVIEW_REQUIRED = "PREVIEW_REQUIRED";
  public static final String STALE_STATE = "STALE_STATE";
  public static final String CAMPAIGN_TEMPLATE = "campaign";
  public static final String AUDIT_DRAFT = "CAMPAIGN_DRAFT";
  public static final String AUDIT_PREVIEW = "CAMPAIGN_PREVIEW";
  public static final String AUDIT_READY = "CAMPAIGN_READY";

  private CampaignPolicy() {}

  public static boolean allows(AppUserRole role, boolean campaignsModule) {
    if (!campaignsModule) {
      return false;
    }
    return role == AppUserRole.pharmacy_owner || role == AppUserRole.pharmacy_staff;
  }

  public static void requireAllowed(AppUserRole role, boolean campaignsModule) {
    if (!allows(role, campaignsModule)) {
      throw forbidden();
    }
  }

  public static void requireApprovedTemplate(WhatsAppApprovalStatus status, boolean namespaced) {
    if (!namespaced || status != WhatsAppApprovalStatus.APPROVED) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          UNAPPROVED_TEMPLATE,
          "This WhatsApp template is not approved for this pharmacy.");
    }
  }

  public static void requireCampaignTemplate(String uniqueName) {
    if (!CAMPAIGN_TEMPLATE.equals(uniqueName)) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          UNAPPROVED_TEMPLATE,
          "This WhatsApp template is not approved for this pharmacy.");
    }
  }

  public static Map<String, String> requireTenantVariables(
      List<String> tenantSlots, List<String> runtimeSlots, Map<String, String> incoming) {
    return WhatsAppTemplatePolicy.requireTenantVariables(tenantSlots, runtimeSlots, incoming);
  }

  public static void requireAudience(Collection<UUID> customerIds) {
    if (customerIds == null || customerIds.isEmpty()) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          EMPTY_AUDIENCE,
          "No patients match this tag list. Add tags, then count again.");
    }
  }

  public static void requireDraft(CampaignStatus status) {
    if (status == CampaignStatus.READY_FOR_DELIVERY) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          READY_ALREADY,
          "This broadcast is already ready to send.");
    }
    if (status != CampaignStatus.DRAFT) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          READY_ALREADY,
          "This broadcast is already ready to send.");
    }
  }

  public static void requirePreviewed(Instant previewedAt, Integer recipientCount) {
    if (previewedAt == null || recipientCount == null || recipientCount <= 0) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          PREVIEW_REQUIRED,
          "Count this list before marking it ready to send.");
    }
  }

  public static void requireVersion(int current, Integer expected) {
    if (expected == null || expected != current) {
      throw new ApiException(
          HttpStatus.CONFLICT, STALE_STATE, "This broadcast was updated. Reload and try again.");
    }
  }

  public static List<UUID> dedupe(Collection<UUID> ids) {
    if (ids == null || ids.isEmpty()) {
      return List.of();
    }
    return new ArrayList<>(new LinkedHashSet<>(ids));
  }

  public static ApiException forbidden() {
    return new ApiException(HttpStatus.FORBIDDEN, FORBIDDEN, "Forbidden");
  }

  public static ApiException notFound() {
    return new ApiException(HttpStatus.NOT_FOUND, NOT_FOUND, "Broadcast was not found.");
  }

  public static ApiException shape() {
    return new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
  }
}
