package com.nammamedmate.server.domain;

import com.nammamedmate.server.shared.exception.ApiException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;

public final class WhatsAppTemplatePolicy {

  public static final String UNKNOWN_VARIABLE = "UNKNOWN_VARIABLE";
  public static final String UNAPPROVED_TEMPLATE = "UNAPPROVED_TEMPLATE";
  public static final String STRUCTURAL_REWRITE = "STRUCTURAL_REWRITE";
  public static final String NAMESPACE_COLLISION = "NAMESPACE_COLLISION";
  public static final String STALE_STATE = "STALE_STATE";
  public static final String FORBIDDEN = "FORBIDDEN";
  public static final String NOT_FOUND = "NOT_FOUND";
  public static final Set<String> ALLOWED_PUT_FIELDS = Set.of("variables", "version");

  private WhatsAppTemplatePolicy() {}

  public static String namespaceName(UUID tenantId, String uniqueName) {
    return tenantId + "_" + uniqueName;
  }

  public static void rejectStructuralRewrite(Set<String> fieldNames) {
    if (fieldNames == null) {
      return;
    }
    for (String name : fieldNames) {
      if (!ALLOWED_PUT_FIELDS.contains(name)) {
        throw new ApiException(
            HttpStatus.UNPROCESSABLE_ENTITY,
            STRUCTURAL_REWRITE,
            "WhatsApp template structure cannot be rewritten.");
      }
    }
  }

  public static Map<String, String> requireTenantVariables(
      List<String> tenantSlots, List<String> runtimeSlots, Map<String, String> incoming) {
    Map<String, String> source = incoming == null ? Map.of() : incoming;
    Map<String, String> cleaned = new LinkedHashMap<>();
    for (Map.Entry<String, String> entry : source.entrySet()) {
      String key = entry.getKey();
      if ((runtimeSlots != null && runtimeSlots.contains(key)) || !tenantSlots.contains(key)) {
        throw new ApiException(
            HttpStatus.UNPROCESSABLE_ENTITY,
            UNKNOWN_VARIABLE,
            "This slot is not a tenant variable on the approved template.");
      }
      cleaned.put(key, entry.getValue() == null ? "" : entry.getValue());
    }
    return cleaned;
  }

  public static void requireApproved(WhatsAppApprovalStatus status) {
    if (status != WhatsAppApprovalStatus.APPROVED) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          UNAPPROVED_TEMPLATE,
          "This WhatsApp template is not approved.");
    }
  }

  public static void requireVersion(int current, Integer expected) {
    if (current == 0 && (expected == null || expected == 0)) {
      return;
    }
    if (expected == null || expected != current) {
      throw new ApiException(
          HttpStatus.CONFLICT,
          STALE_STATE,
          "These WhatsApp slots were updated. Reload and save again.");
    }
  }

  public static String preview(String body, Map<String, String> variables) {
    String rendered = body == null ? "" : body;
    if (variables == null) {
      return rendered;
    }
    for (Map.Entry<String, String> entry : variables.entrySet()) {
      if (entry.getValue() == null || entry.getValue().isBlank()) {
        continue;
      }
      rendered = rendered.replace("{{" + entry.getKey() + "}}", entry.getValue());
    }
    return rendered;
  }

  public static ApiException forbidden() {
    return new ApiException(HttpStatus.FORBIDDEN, FORBIDDEN, "Forbidden");
  }

  public static ApiException notFound() {
    return new ApiException(HttpStatus.NOT_FOUND, NOT_FOUND, "WhatsApp template not found.");
  }

  public static ApiException namespaceCollision() {
    return new ApiException(
        HttpStatus.CONFLICT, NAMESPACE_COLLISION, "This tenant namespace is already used.");
  }

  public static ApiException shape() {
    return new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
  }
}
