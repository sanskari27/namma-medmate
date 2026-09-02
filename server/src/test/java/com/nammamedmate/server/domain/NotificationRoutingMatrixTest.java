package com.nammamedmate.server.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;

class NotificationRoutingMatrixTest {

  @Test
  void ac01_lowStockTargetsBranchInventoryAndOwner() {
    assertThat(NotificationTrigger.LOW_STOCK.specs())
        .containsExactly(
            new RouteSpec(RoutingRole.INVENTORY, DeliveryChannel.IN_APP),
            new RouteSpec(RoutingRole.OWNER, DeliveryChannel.IN_APP));
    assertThat(NotificationTrigger.LOW_STOCK.branchRequired()).isTrue();
  }

  @Test
  void ac01_expiryTargetsInventoryAndPharmacist() {
    assertThat(roles(NotificationTrigger.ITEM_EXPIRY))
        .containsExactly(RoutingRole.INVENTORY, RoutingRole.PHARMACIST);
  }

  @Test
  void ac01_transfersTargetInventoryAndOwner() {
    assertThat(roles(NotificationTrigger.TRANSFER_REQUESTED))
        .containsExactly(RoutingRole.INVENTORY, RoutingRole.OWNER);
    assertThat(roles(NotificationTrigger.TRANSFER_RECEIPT))
        .containsExactly(RoutingRole.INVENTORY, RoutingRole.OWNER);
  }

  @Test
  void ac01_supplierDueTargetsAccountantAndOwner() {
    assertThat(roles(NotificationTrigger.SUPPLIER_DUE))
        .containsExactly(RoutingRole.ACCOUNTANT, RoutingRole.OWNER);
  }

  @Test
  void ac01_licenseAndSubscriptionIncludeMaster() {
    assertThat(roles(NotificationTrigger.LICENSE_EXPIRY))
        .containsExactly(RoutingRole.OWNER, RoutingRole.MASTER);
    assertThat(roles(NotificationTrigger.SUBSCRIPTION_EXPIRY))
        .containsExactly(RoutingRole.OWNER, RoutingRole.MASTER);
  }

  @Test
  void ac01_staffLicenseTargetsOwnerAndAffectedStaff() {
    assertThat(roles(NotificationTrigger.STAFF_LICENSE))
        .containsExactly(RoutingRole.OWNER, RoutingRole.AFFECTED_STAFF);
  }

  @Test
  void ac01_creditDueRecordsWhatsAppWithoutSms() {
    assertThat(NotificationTrigger.CREDIT_DUE.specs())
        .containsExactly(
            new RouteSpec(RoutingRole.ACCOUNTANT, DeliveryChannel.IN_APP),
            new RouteSpec(RoutingRole.OWNER, DeliveryChannel.IN_APP),
            new RouteSpec(RoutingRole.CUSTOMER, DeliveryChannel.WHATSAPP));
    assertThat(NotificationTrigger.CREDIT_DUE.specs())
        .extracting(RouteSpec::channel)
        .doesNotContain(DeliveryChannel.CREDENTIAL);
  }

  @Test
  void ac01_newUserUsesCredentialChannel() {
    assertThat(NotificationTrigger.ACCOUNT_CREATED.specs())
        .containsExactly(
            new RouteSpec(RoutingRole.NEW_USER, DeliveryChannel.CREDENTIAL),
            new RouteSpec(RoutingRole.NEW_USER, DeliveryChannel.IN_APP));
  }

  @Test
  void ac01_kycAndPlanLimitTargetOwnerOnly() {
    assertThat(roles(NotificationTrigger.KYC)).containsExactly(RoutingRole.OWNER);
    assertThat(roles(NotificationTrigger.PLAN_LIMIT)).containsExactly(RoutingRole.OWNER);
  }

  @Test
  void ac01_approvalHasNoStaticRecipients() {
    assertThat(NotificationTrigger.APPROVAL_REQUESTED.specs()).isEmpty();
  }

  private static List<RoutingRole> roles(NotificationTrigger trigger) {
    return trigger.specs().stream().map(RouteSpec::role).toList();
  }
}
