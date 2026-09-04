package com.nammamedmate.server.domain;

import com.nammamedmate.server.shared.exception.ApiException;
import java.math.BigDecimal;
import org.springframework.http.HttpStatus;

public final class StockTakePolicy {

  private StockTakePolicy() {}

  public static void requireOwnerStart(AppUserRole role) {
    if (role != AppUserRole.pharmacy_owner) {
      throw new ApiException(
          HttpStatus.FORBIDDEN, "FORBIDDEN", "Only the owner can start a physical count.");
    }
  }

  public static void requireOpen(StockTakeStatus status) {
    if (status != StockTakeStatus.OPEN) {
      throw new ApiException(
          HttpStatus.CONFLICT, "STALE_STATE", "This physical count is no longer open.");
    }
  }

  public static BigDecimal requireCountedQuantity(BigDecimal quantity, int precision) {
    if (quantity == null || quantity.compareTo(BigDecimal.ZERO) < 0) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
    BigDecimal normalized = quantity.stripTrailingZeros();
    int scale = Math.max(normalized.scale(), 0);
    if (scale > precision) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          "PRECISION_LOSS",
          "Quantity exceeds the product allowed precision.");
    }
    return normalized;
  }

  public static void requireComplete(BigDecimal countedQuantity) {
    if (countedQuantity == null) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          "INCOMPLETE_COUNT",
          "Count every line before posting variances.");
    }
  }

  public static BigDecimal variance(BigDecimal expected, BigDecimal counted) {
    return counted.subtract(expected);
  }

  public static StockAdjustmentDirection directionForVariance(BigDecimal variance) {
    if (variance.compareTo(BigDecimal.ZERO) > 0) {
      return StockAdjustmentDirection.IN;
    }
    if (variance.compareTo(BigDecimal.ZERO) < 0) {
      return StockAdjustmentDirection.OUT;
    }
    return null;
  }

  public static BigDecimal adjustmentQuantity(BigDecimal variance) {
    return variance.abs();
  }
}
