package com.nammamedmate.server.domain;

import com.nammamedmate.server.shared.exception.ApiException;
import java.math.BigDecimal;
import org.springframework.http.HttpStatus;

public final class StockAdjustmentPolicy {

  private StockAdjustmentPolicy() {}

  public static StockAdjustmentReason requireReason(String raw) {
    if (raw == null || raw.isBlank()) {
      throw unknownReason();
    }
    try {
      return StockAdjustmentReason.valueOf(raw.trim());
    } catch (IllegalArgumentException ex) {
      throw unknownReason();
    }
  }

  public static StockAdjustmentDirection requireDirection(
      StockAdjustmentReason reason, String raw) {
    if (raw == null || raw.isBlank()) {
      if (reason.allowsIncrease()) {
        throw invalidDirection();
      }
      return StockAdjustmentDirection.OUT;
    }
    StockAdjustmentDirection direction;
    try {
      direction = StockAdjustmentDirection.valueOf(raw.trim());
    } catch (IllegalArgumentException ex) {
      throw invalidDirection();
    }
    if (direction == StockAdjustmentDirection.IN && !reason.allowsIncrease()) {
      throw invalidDirection();
    }
    return direction;
  }

  public static BigDecimal requirePositiveQuantity(BigDecimal quantity, int precision) {
    if (quantity == null || quantity.compareTo(BigDecimal.ZERO) <= 0) {
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

  private static ApiException unknownReason() {
    return new ApiException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        "UNKNOWN_REASON",
        "Adjustment reason is not an approved write-off reason.");
  }

  private static ApiException invalidDirection() {
    return new ApiException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        "INVALID_DIRECTION",
        "Only a physical-count correction may increase on-hand stock.");
  }
}
