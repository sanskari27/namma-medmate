package com.nammamedmate.server.application.notification;

import com.nammamedmate.server.domain.NotificationTrigger;

final class NotificationRoutingCopy {

  private NotificationRoutingCopy() {}

  static Content content(NotificationTrigger trigger) {
    return switch (trigger) {
      case LOW_STOCK ->
          new Content(
              "low_stock",
              "/inventory",
              null,
              "Low stock / reorder",
              "A line at this branch is below reorder. Open inventory to indent.",
              null,
              null);
      case ITEM_EXPIRY ->
          new Content(
              "item_expiry",
              "/inventory",
              null,
              "Item expiring soon",
              "A batch at this branch is nearing expiry. Open inventory to walk the rack.",
              null,
              null);
      case TRANSFER_REQUESTED ->
          new Content(
              "transfer_requested",
              "/inventory",
              null,
              "Pull transfer requested",
              "Another branch asked to pull stock. Open inventory to send it.",
              null,
              null);
      case TRANSFER_RECEIPT ->
          new Content(
              "transfer_receipt",
              "/inventory",
              null,
              "Transfer awaiting receipt",
              "Stock is on the way. Open inventory to confirm receipt.",
              null,
              null);
      case APPROVAL_REQUESTED ->
          new Content(
              "approval",
              "/approvals/pending",
              "/sign-offs",
              "Approval requested",
              "A counter action is waiting on your approval.",
              "Approval requested",
              "A pharmacy action is waiting on HQ sign-off.");
      case SUPPLIER_DUE ->
          new Content(
              "supplier_due",
              "/purchases",
              null,
              "Supplier payment due",
              "A distributor bill is coming due. Open purchases to settle it.",
              null,
              null);
      case LICENSE_EXPIRY ->
          new Content(
              "license_expiry",
              "/licenses",
              "/licence-expiry",
              "License expiring",
              "A pharmacy license is nearing expiry. Open licences to renew it.",
              "License expiring",
              "A tenant or branch license is nearing expiry. Open licence expiry.");
      case STAFF_LICENSE ->
          new Content(
              "staff_license",
              "/account",
              null,
              "Staff license expiring",
              "A staff license is nearing expiry. Open licences to renew it.",
              null,
              null);
      case CREDIT_DUE ->
          new Content(
              "credit_due",
              "/credit",
              null,
              "Customer credit due",
              "A khata balance is due. Open credit to follow up.",
              null,
              null);
      case ACCOUNT_CREATED ->
          new Content(
              "account_created",
              "/account",
              "/operators",
              "New user account",
              "A sign-in was created. Check account to set up this till.",
              "New pharmacy account",
              "A pharmacy sign-in was created. Open operators if HQ needs the file.");
      case KYC ->
          new Content(
              "kyc",
              "/account",
              "/kyc",
              "KYC decision",
              "KYC for this pharmacy was decided. Open account to review.",
              "KYC pack waiting",
              "A pharmacy filed KYC. Open the tenant KYC queue.");
      case PLAN_LIMIT ->
          new Content(
              "plan_limit",
              "/subscription",
              null,
              "Plan limit reached",
              "This pharmacy hit a plan limit. Open subscription to upgrade.",
              null,
              null);
      case SUBSCRIPTION_EXPIRY ->
          new Content(
              "subscription_expiry",
              "/subscription",
              "/subscriptions",
              "Subscription expiring",
              "This pharmacy's plan is nearing expiry. Open subscription to renew.",
              "Subscription expiring",
              "A tenant plan is nearing expiry. Open subscriptions.");
      case HOSPITAL_CREDIT_DUE ->
          new Content(
              "hospital_credit_due",
              "/hospital-billing?view=statement",
              null,
              "Hospital credit overdue",
              "The hospital account is overdue. Open the statement to record a payment.",
              null,
              null);
    };
  }

  record Content(
      String sourceType,
      String staffHref,
      String masterHref,
      String staffTitle,
      String staffBody,
      String masterTitle,
      String masterBody) {

    String hrefFor(boolean master) {
      if (master && masterHref != null) {
        return masterHref;
      }
      return staffHref;
    }

    String titleFor(boolean master) {
      if (master && masterTitle != null) {
        return masterTitle;
      }
      return staffTitle;
    }

    String bodyFor(boolean master) {
      if (master && masterBody != null) {
        return masterBody;
      }
      return staffBody;
    }
  }
}
