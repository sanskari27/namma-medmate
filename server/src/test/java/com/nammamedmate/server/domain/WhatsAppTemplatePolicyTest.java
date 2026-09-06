package com.nammamedmate.server.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.nammamedmate.server.shared.exception.ApiException;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class WhatsAppTemplatePolicyTest {

  private static final UUID TENANT = UUID.fromString("11111111-1111-1111-1111-111111111111");

  @Test
  void ac02_namespaceIsTenantIdPlusUniqueName() {
    assertThat(WhatsAppTemplatePolicy.namespaceName(TENANT, "refill_due"))
        .isEqualTo("11111111-1111-1111-1111-111111111111_refill_due");
  }

  @Test
  void ac03_tenantSlotsAcceptedRuntimeSlotsRejected() {
    Map<String, String> ok =
        WhatsAppTemplatePolicy.requireTenantVariables(
            List.of("pharmacy_name"),
            List.of("customer_name", "medicine_name"),
            Map.of("pharmacy_name", "Varshmaan"));
    assertThat(ok).containsEntry("pharmacy_name", "Varshmaan");

    assertThatThrownBy(
            () ->
                WhatsAppTemplatePolicy.requireTenantVariables(
                    List.of("pharmacy_name"),
                    List.of("customer_name"),
                    Map.of("customer_name", "Ravi")))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(WhatsAppTemplatePolicy.UNKNOWN_VARIABLE);
  }

  @Test
  void ac05_unknownVariableIsRejected() {
    assertThatThrownBy(
            () ->
                WhatsAppTemplatePolicy.requireTenantVariables(
                    List.of("pharmacy_name"), List.of("customer_name"), Map.of("tone", "casual")))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(WhatsAppTemplatePolicy.UNKNOWN_VARIABLE);
  }

  @Test
  void ac04_structuralFieldsAreRewrite() {
    assertThatThrownBy(() -> WhatsAppTemplatePolicy.rejectStructuralRewrite(Set.of("body")))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(WhatsAppTemplatePolicy.STRUCTURAL_REWRITE);
    WhatsAppTemplatePolicy.rejectStructuralRewrite(Set.of("variables", "version"));
  }

  @Test
  void ac05_unapprovedStructureIsRejected() {
    assertThatThrownBy(
            () -> WhatsAppTemplatePolicy.requireApproved(WhatsAppApprovalStatus.PENDING))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(WhatsAppTemplatePolicy.UNAPPROVED_TEMPLATE);
    WhatsAppTemplatePolicy.requireApproved(WhatsAppApprovalStatus.APPROVED);
  }

  @Test
  void ac05_staleVersionConflicts() {
    assertThatThrownBy(() -> WhatsAppTemplatePolicy.requireVersion(2, 1))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(WhatsAppTemplatePolicy.STALE_STATE);
    WhatsAppTemplatePolicy.requireVersion(0, null);
    WhatsAppTemplatePolicy.requireVersion(1, 1);
  }

  @Test
  void ac03_previewFillsTenantSlotsOnly() {
    String preview =
        WhatsAppTemplatePolicy.preview(
            "Hi {{customer_name}}, visit {{pharmacy_name}} for {{medicine_name}}.",
            Map.of("pharmacy_name", "Varshmaan"));
    assertThat(preview)
        .isEqualTo("Hi {{customer_name}}, visit Varshmaan for {{medicine_name}}.");
  }
}
