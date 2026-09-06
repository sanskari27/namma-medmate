package com.nammamedmate.server.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.nammamedmate.server.shared.exception.ApiException;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class CampaignPolicyTest {

  @Test
  void ac02_ownerWithCampaignsModuleIsAllowed() {
    assertThat(CampaignPolicy.allows(AppUserRole.pharmacy_owner, true)).isTrue();
    CampaignPolicy.requireAllowed(AppUserRole.pharmacy_owner, true);
  }

  @Test
  void ac02_staffWithCampaignsModuleIsAllowed() {
    assertThat(CampaignPolicy.allows(AppUserRole.pharmacy_staff, true)).isTrue();
    CampaignPolicy.requireAllowed(AppUserRole.pharmacy_staff, true);
  }

  @Test
  void ac02_crmOnlyStaffAndMasterAreDenied() {
    assertThat(CampaignPolicy.allows(AppUserRole.pharmacy_staff, false)).isFalse();
    assertThat(CampaignPolicy.allows(AppUserRole.pharmacy_owner, false)).isFalse();
    assertThat(CampaignPolicy.allows(AppUserRole.admin_super, true)).isFalse();
    assertThatThrownBy(() -> CampaignPolicy.requireAllowed(AppUserRole.pharmacy_staff, false))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(CampaignPolicy.FORBIDDEN);
  }

  @Test
  void ac02_campaignsModuleIsAssignableAndNotPlanGated() {
    assertThat(ModuleCode.CAMPAIGNS.tenantModule()).isTrue();
    assertThat(ModuleCode.CAMPAIGNS.planGated()).isFalse();
    assertThat(PlanModuleEntitlements.entitledForTenant(PlanCode.FREE, ModuleCode.CAMPAIGNS))
        .isTrue();
  }

  @Test
  void ac01_unapprovedOrMissingNamespaceIsRejected() {
    assertThatThrownBy(
            () -> CampaignPolicy.requireApprovedTemplate(WhatsAppApprovalStatus.PENDING, true))
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(CampaignPolicy.UNAPPROVED_TEMPLATE);
    assertThatThrownBy(
            () -> CampaignPolicy.requireApprovedTemplate(WhatsAppApprovalStatus.APPROVED, false))
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(CampaignPolicy.UNAPPROVED_TEMPLATE);
    CampaignPolicy.requireApprovedTemplate(WhatsAppApprovalStatus.APPROVED, true);
  }

  @Test
  void ac05_unknownAndRuntimeVariablesAreRejected() {
    Map<String, String> ok =
        CampaignPolicy.requireTenantVariables(
            List.of("pharmacy_name"),
            List.of("customer_name"),
            Map.of("pharmacy_name", "Varshmaan"));
    assertThat(ok).containsEntry("pharmacy_name", "Varshmaan");
    assertThatThrownBy(
            () ->
                CampaignPolicy.requireTenantVariables(
                    List.of("pharmacy_name"),
                    List.of("customer_name"),
                    Map.of("customer_name", "Ravi")))
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(CampaignPolicy.UNKNOWN_VARIABLE);
  }

  @Test
  void ac05_emptyAudienceIsRejected() {
    assertThatThrownBy(() -> CampaignPolicy.requireAudience(List.of()))
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(CampaignPolicy.EMPTY_AUDIENCE);
    CampaignPolicy.requireAudience(List.of(UUID.randomUUID()));
  }

  @Test
  void ac04_readyRequiresDraftAndPreview() {
    CampaignPolicy.requireDraft(CampaignStatus.DRAFT);
    assertThatThrownBy(() -> CampaignPolicy.requireDraft(CampaignStatus.READY_FOR_DELIVERY))
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(CampaignPolicy.READY_ALREADY);
    assertThatThrownBy(() -> CampaignPolicy.requirePreviewed(null, 2))
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(CampaignPolicy.PREVIEW_REQUIRED);
  }

  @Test
  void ac04_audienceIsDeduplicated() {
    UUID one = UUID.fromString("11111111-1111-1111-1111-111111111111");
    UUID two = UUID.fromString("22222222-2222-2222-2222-222222222222");
    assertThat(CampaignPolicy.dedupe(List.of(one, two, one))).containsExactly(one, two);
    assertThat(CampaignPolicy.dedupe(Set.of(two, one))).containsExactlyInAnyOrder(one, two);
  }
}
