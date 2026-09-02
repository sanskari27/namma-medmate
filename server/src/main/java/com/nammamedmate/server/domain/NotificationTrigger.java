package com.nammamedmate.server.domain;

import java.util.Arrays;
import java.util.List;

public enum NotificationTrigger {
  LOW_STOCK(true, specs(RoutingRole.INVENTORY, RoutingRole.OWNER)),
  ITEM_EXPIRY(true, specs(RoutingRole.INVENTORY, RoutingRole.PHARMACIST)),
  TRANSFER_REQUESTED(true, specs(RoutingRole.INVENTORY, RoutingRole.OWNER)),
  TRANSFER_RECEIPT(true, specs(RoutingRole.INVENTORY, RoutingRole.OWNER)),
  APPROVAL_REQUESTED(false, List.of()),
  SUPPLIER_DUE(false, specs(RoutingRole.ACCOUNTANT, RoutingRole.OWNER)),
  LICENSE_EXPIRY(false, specs(RoutingRole.OWNER, RoutingRole.MASTER)),
  STAFF_LICENSE(false, specs(RoutingRole.OWNER, RoutingRole.AFFECTED_STAFF)),
  CREDIT_DUE(
      false,
      List.of(
          spec(RoutingRole.ACCOUNTANT, DeliveryChannel.IN_APP),
          spec(RoutingRole.OWNER, DeliveryChannel.IN_APP),
          spec(RoutingRole.CUSTOMER, DeliveryChannel.WHATSAPP))),
  ACCOUNT_CREATED(
      false,
      List.of(
          spec(RoutingRole.NEW_USER, DeliveryChannel.CREDENTIAL),
          spec(RoutingRole.NEW_USER, DeliveryChannel.IN_APP))),
  KYC(false, specs(RoutingRole.OWNER)),
  PLAN_LIMIT(false, specs(RoutingRole.OWNER)),
  SUBSCRIPTION_EXPIRY(false, specs(RoutingRole.OWNER, RoutingRole.MASTER));

  private final boolean branchRequired;
  private final List<RouteSpec> specs;

  NotificationTrigger(boolean branchRequired, List<RouteSpec> specs) {
    this.branchRequired = branchRequired;
    this.specs = List.copyOf(specs);
  }

  public boolean branchRequired() {
    return branchRequired;
  }

  public List<RouteSpec> specs() {
    return specs;
  }

  private static RouteSpec spec(RoutingRole role, DeliveryChannel channel) {
    return new RouteSpec(role, channel);
  }

  private static List<RouteSpec> specs(RoutingRole... roles) {
    return Arrays.stream(roles).map(role -> spec(role, DeliveryChannel.IN_APP)).toList();
  }
}
