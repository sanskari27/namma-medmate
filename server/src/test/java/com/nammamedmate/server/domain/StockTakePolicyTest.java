package com.nammamedmate.server.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.nammamedmate.server.shared.exception.ApiException;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

class StockTakePolicyTest {

  @Test
  void onlyOwnerMayStart() {
    StockTakePolicy.requireOwnerStart(AppUserRole.pharmacy_owner);
    assertThatThrownBy(() -> StockTakePolicy.requireOwnerStart(AppUserRole.pharmacy_staff))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo("FORBIDDEN");
  }

  @Test
  void countsAllowZeroAndRejectNegative() {
    assertThat(StockTakePolicy.requireCountedQuantity(BigDecimal.ZERO, 0))
        .isEqualByComparingTo("0");
    assertThatThrownBy(() -> StockTakePolicy.requireCountedQuantity(new BigDecimal("-1"), 0))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo("VALIDATION_ERROR");
  }

  @Test
  void incompleteCountBlocksPost() {
    assertThatThrownBy(() -> StockTakePolicy.requireComplete(null))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo("INCOMPLETE_COUNT");
  }

  @Test
  void varianceDirectionMatchesPhysicalCount() {
    assertThat(StockTakePolicy.directionForVariance(new BigDecimal("2")))
        .isEqualTo(StockAdjustmentDirection.IN);
    assertThat(StockTakePolicy.directionForVariance(new BigDecimal("-3")))
        .isEqualTo(StockAdjustmentDirection.OUT);
    assertThat(StockTakePolicy.directionForVariance(BigDecimal.ZERO)).isNull();
    assertThat(StockTakePolicy.adjustmentQuantity(new BigDecimal("-3"))).isEqualByComparingTo("3");
  }

  @Test
  void postedTakeIsStaleForFurtherCounts() {
    assertThatThrownBy(() -> StockTakePolicy.requireOpen(StockTakeStatus.POSTED))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo("STALE_STATE");
  }
}
