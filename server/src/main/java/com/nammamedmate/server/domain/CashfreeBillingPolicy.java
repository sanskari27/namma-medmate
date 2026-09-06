package com.nammamedmate.server.domain;

import com.nammamedmate.server.shared.exception.ApiException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;

public final class CashfreeBillingPolicy {

  public static final String PROVIDER = "CASHFREE";
  public static final String PAYMENT_REQUIRED = "PAYMENT_REQUIRED";
  public static final String PROVIDER_UNAVAILABLE = "PROVIDER_UNAVAILABLE";
  public static final String AMOUNT_MISMATCH = "AMOUNT_MISMATCH";
  public static final String TENANT_MISMATCH = "TENANT_MISMATCH";
  public static final String POS_GATEWAY = "POS_GATEWAY";
  public static final String FORBIDDEN = "FORBIDDEN";
  public static final String NOT_FOUND = "NOT_FOUND";
  public static final String AUDIT_CHECKOUT = "SUBSCRIPTION_CHECKOUT";
  public static final String AUDIT_PAYMENT = "SUBSCRIPTION_PAYMENT";
  public static final Duration PENDING_AGE = Duration.ofMinutes(30);
  public static final String PAYMENT_REQUIRED_MESSAGE =
      "Pay this pharmacy’s plan through checkout before it can go live.";
  public static final String PROVIDER_UNAVAILABLE_MESSAGE =
      "Checkout is not available right now. Try again in a few minutes.";

  private CashfreeBillingPolicy() {}

  public static PlanCode requirePaidPlan(PlanCode plan) {
    if (plan == null) {
      throw shape();
    }
    if (plan == PlanCode.FREE || PlanCatalogue.pricePaiseMonthly(plan) <= 0) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          PAYMENT_REQUIRED,
          "Free has no checkout. Switch this pharmacy without a payment.");
    }
    return plan;
  }

  public static void requirePaymentForPaidUpgrade(PlanCode plan) {
    if (plan != null && plan != PlanCode.FREE && PlanCatalogue.pricePaiseMonthly(plan) > 0) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY, PAYMENT_REQUIRED, PAYMENT_REQUIRED_MESSAGE);
    }
  }

  public static int amountPaise(PlanCode plan) {
    return PlanCatalogue.pricePaiseMonthly(requirePaidPlan(plan));
  }

  public static BigDecimal rupeesFromPaise(int amountPaise) {
    return BigDecimal.valueOf(amountPaise).movePointLeft(2).setScale(2, RoundingMode.UNNECESSARY);
  }

  public static int paiseFromRupees(BigDecimal rupees) {
    if (rupees == null) {
      throw amountMismatch();
    }
    return rupees.movePointRight(2).setScale(0, RoundingMode.HALF_UP).intValueExact();
  }

  public static void requireMatchingAmount(int storedPaise, BigDecimal webhookRupees) {
    if (storedPaise != paiseFromRupees(webhookRupees)) {
      throw amountMismatch();
    }
  }

  public static void requireMatchingTenant(UUID stored, UUID claimed) {
    if (claimed != null && !stored.equals(claimed)) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          TENANT_MISMATCH,
          "This checkout does not belong to that pharmacy.");
    }
  }

  public static void rejectPosGateway(String modeOrPath) {
    if (modeOrPath == null) {
      return;
    }
    String value = modeOrPath.toUpperCase();
    if (value.contains("CASHFREE")) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          POS_GATEWAY,
          "Cashfree is not used for customer bills at the till.");
    }
  }

  public static boolean posModesExcludeCashfree(Set<String> modes) {
    return modes != null && !modes.contains("CASHFREE");
  }

  public static boolean isException(SubscriptionPaymentStatus status, Instant createdAt, Instant now) {
    if (status == SubscriptionPaymentStatus.FAILED
        || status == SubscriptionPaymentStatus.ABANDONED) {
      return true;
    }
    return status == SubscriptionPaymentStatus.PENDING
        && createdAt != null
        && now != null
        && !createdAt.isAfter(now.minus(PENDING_AGE));
  }

  public static ApiException amountMismatch() {
    return new ApiException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        AMOUNT_MISMATCH,
        "Checkout amount does not match this pharmacy’s plan.");
  }

  public static ApiException forbidden() {
    return new ApiException(HttpStatus.FORBIDDEN, FORBIDDEN, "Forbidden");
  }

  public static ApiException notFound() {
    return new ApiException(HttpStatus.NOT_FOUND, NOT_FOUND, "Checkout was not found.");
  }

  public static ApiException shape() {
    return new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
  }

  public static ApiException providerUnavailable() {
    return new ApiException(
        HttpStatus.UNPROCESSABLE_ENTITY, PROVIDER_UNAVAILABLE, PROVIDER_UNAVAILABLE_MESSAGE);
  }
}
