package com.nammamedmate.server.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.nammamedmate.server.shared.exception.ApiException;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

class StockAdjustmentPolicyTest {

  @Test
  void acceptsTheFiveApprovedReasons() {
    assertThat(StockAdjustmentPolicy.requireReason("DAMAGE_BREAKAGE"))
        .isEqualTo(StockAdjustmentReason.DAMAGE_BREAKAGE);
    assertThat(StockAdjustmentPolicy.requireReason("EXPIRY_WRITE_OFF"))
        .isEqualTo(StockAdjustmentReason.EXPIRY_WRITE_OFF);
    assertThat(StockAdjustmentPolicy.requireReason("THEFT_LOSS"))
        .isEqualTo(StockAdjustmentReason.THEFT_LOSS);
    assertThat(StockAdjustmentPolicy.requireReason("PHYSICAL_COUNT"))
        .isEqualTo(StockAdjustmentReason.PHYSICAL_COUNT);
    assertThat(StockAdjustmentPolicy.requireReason("SAMPLE_FREE_GOODS"))
        .isEqualTo(StockAdjustmentReason.SAMPLE_FREE_GOODS);
  }

  @Test
  void rejectsUnknownReason() {
    assertThatThrownBy(() -> StockAdjustmentPolicy.requireReason("SHRINKAGE"))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo("UNKNOWN_REASON");
  }

  @Test
  void writeOffsDefaultToOutAndRejectIncrease() {
    assertThat(StockAdjustmentPolicy.requireDirection(StockAdjustmentReason.DAMAGE_BREAKAGE, null))
        .isEqualTo(StockAdjustmentDirection.OUT);
    assertThatThrownBy(
            () -> StockAdjustmentPolicy.requireDirection(StockAdjustmentReason.THEFT_LOSS, "IN"))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo("INVALID_DIRECTION");
  }

  @Test
  void physicalCountRequiresExplicitDirection() {
    assertThatThrownBy(
            () ->
                StockAdjustmentPolicy.requireDirection(StockAdjustmentReason.PHYSICAL_COUNT, null))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo("INVALID_DIRECTION");
    assertThat(StockAdjustmentPolicy.requireDirection(StockAdjustmentReason.PHYSICAL_COUNT, "IN"))
        .isEqualTo(StockAdjustmentDirection.IN);
  }

  @Test
  void rejectsNonPositiveQuantity() {
    assertThatThrownBy(() -> StockAdjustmentPolicy.requirePositiveQuantity(BigDecimal.ZERO, 0))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo("VALIDATION_ERROR");
  }
}
