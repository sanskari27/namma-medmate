package com.nammamedmate.server.domain;

import com.nammamedmate.server.shared.exception.ApiException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;
import org.springframework.http.HttpStatus;

public final class LoyaltyPolicy {

  public static final String PLAN_LIMIT = "PLAN_LIMIT";
  public static final String INSUFFICIENT_POINTS = "INSUFFICIENT_POINTS";
  public static final String REDEEM_LIMIT = "REDEEM_LIMIT";
  public static final String LOYALTY_REQUIRES_CUSTOMER = "LOYALTY_REQUIRES_CUSTOMER";
  public static final String PLAN_LIMIT_MESSAGE = "Points earn and redeem need Growth or Pro.";

  private static final long PAISE_PER_POINT = 100L;
  private static final long TAXABLE_PAISE_PER_POINT = 10000L;

  private LoyaltyPolicy() {}

  public static boolean entitled(PlanCode plan) {
    return PlanModuleEntitlements.entitledForTenant(plan, ModuleCode.LOYALTY);
  }

  public static void assertEntitled(PlanCode plan) {
    if (!entitled(plan)) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, PLAN_LIMIT, PLAN_LIMIT_MESSAGE);
    }
  }

  public static long earnPoints(long taxablePaidPaise) {
    if (taxablePaidPaise <= 0L) {
      return 0L;
    }
    return BigDecimal.valueOf(taxablePaidPaise)
        .divide(BigDecimal.valueOf(TAXABLE_PAISE_PER_POINT), 0, RoundingMode.HALF_UP)
        .longValueExact();
  }

  public static long redeemPaise(long points) {
    return points * PAISE_PER_POINT;
  }

  public static long maxRedeemPoints(long totalPaise) {
    if (totalPaise <= 0L) {
      return 0L;
    }
    return (totalPaise * 20L / 100L) / PAISE_PER_POINT;
  }

  public static void assertRedeem(long points, long balance, long totalPaise) {
    if (points < 0L) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
    if (points == 0L) {
      return;
    }
    if (redeemPaise(points) > totalPaise * 20L / 100L) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          REDEEM_LIMIT,
          "Points can cover at most 20% of this bill.");
    }
    if (points > balance) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          INSUFFICIENT_POINTS,
          "This patient does not have enough points.");
    }
  }

  public static void requireCustomer(UUID customerId) {
    if (customerId == null) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          LOYALTY_REQUIRES_CUSTOMER,
          "Link a patient before using points.");
    }
  }

  public static long share(long amount, long numerator, long denominator) {
    if (amount <= 0L || numerator <= 0L || denominator <= 0L) {
      return 0L;
    }
    return BigDecimal.valueOf(amount)
        .multiply(BigDecimal.valueOf(numerator))
        .divide(BigDecimal.valueOf(denominator), 0, RoundingMode.HALF_UP)
        .longValueExact();
  }
}
