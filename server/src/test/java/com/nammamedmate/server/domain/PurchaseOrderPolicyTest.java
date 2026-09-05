package com.nammamedmate.server.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.nammamedmate.server.shared.exception.ApiException;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class PurchaseOrderPolicyTest {

  @Test
  void ac01_oneSupplierIdIsRequiredAndLocked() {
    java.util.UUID supplierId = java.util.UUID.randomUUID();
    assertThat(PurchaseOrderPolicy.requireSupplierId(supplierId)).isEqualTo(supplierId);
    PurchaseOrderPolicy.assertSameSupplier(supplierId, supplierId);
    assertThatThrownBy(() -> PurchaseOrderPolicy.requireSupplierId(null))
        .isInstanceOf(ApiException.class);
    assertThatThrownBy(
            () -> PurchaseOrderPolicy.assertSameSupplier(supplierId, java.util.UUID.randomUUID()))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(PurchaseOrderPolicy.MIXED_SUPPLIER);
  }

  @Test
  void ac03_recalculatesLineAndOrderTotalsInPaise() {
    PurchaseOrderPolicy.LineMoney line =
        PurchaseOrderPolicy.lineMoney(new BigDecimal("10"), 10000L, new BigDecimal("12"), true);
    assertThat(line.subtotalPaise()).isEqualTo(100000L);
    assertThat(line.taxPaise()).isEqualTo(12000L);
    assertThat(line.totalPaise()).isEqualTo(112000L);
    PurchaseOrderPolicy.OrderMoney order =
        PurchaseOrderPolicy.orderMoney(java.util.List.of(line, line));
    assertThat(order.subtotalPaise()).isEqualTo(200000L);
    assertThat(order.taxPaise()).isEqualTo(24000L);
    assertThat(order.totalPaise()).isEqualTo(224000L);
  }

  @Test
  void ac04_closedAndCancelledRejectQuantityEdits() {
    PurchaseOrderPolicy.assertEditable(PurchaseOrderStatus.DRAFT);
    PurchaseOrderPolicy.assertEditable(PurchaseOrderStatus.ISSUED);
    assertThatThrownBy(() -> PurchaseOrderPolicy.assertEditable(PurchaseOrderStatus.CLOSED))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(PurchaseOrderPolicy.PO_CLOSED);
    assertThatThrownBy(() -> PurchaseOrderPolicy.assertEditable(PurchaseOrderStatus.CANCELLED))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(PurchaseOrderPolicy.PO_CLOSED);
  }

  @Test
  void ac04_lifecycleTransitionsAreDirected() {
    PurchaseOrderPolicy.assertTransition(PurchaseOrderStatus.DRAFT, PurchaseOrderStatus.ISSUED);
    PurchaseOrderPolicy.assertTransition(PurchaseOrderStatus.ISSUED, PurchaseOrderStatus.CLOSED);
    PurchaseOrderPolicy.assertTransition(PurchaseOrderStatus.DRAFT, PurchaseOrderStatus.CANCELLED);
    PurchaseOrderPolicy.assertTransition(PurchaseOrderStatus.ISSUED, PurchaseOrderStatus.CANCELLED);
    assertThatThrownBy(
            () ->
                PurchaseOrderPolicy.assertTransition(
                    PurchaseOrderStatus.CLOSED, PurchaseOrderStatus.ISSUED))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(PurchaseOrderPolicy.PO_CLOSED);
  }

  @Test
  void ac05_invalidQuantityAndStaleVersion() {
    assertThatThrownBy(() -> PurchaseOrderPolicy.requireQuantity(BigDecimal.ZERO, 2))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(PurchaseOrderPolicy.INVALID_QUANTITY);
    assertThatThrownBy(() -> PurchaseOrderPolicy.requireUnitRatePaise(0L))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(PurchaseOrderPolicy.INVALID_QUANTITY);
    assertThatThrownBy(() -> PurchaseOrderPolicy.assertVersion(2, 1))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(PurchaseOrderPolicy.STALE_STATE);
  }

  @Test
  void ac01_formatsBranchPoNumber() {
    assertThat(PurchaseOrderPolicy.financialYear(LocalDate.of(2026, 9, 5))).isEqualTo("2026-27");
    assertThat(PurchaseOrderPolicy.financialYear(LocalDate.of(2026, 3, 31))).isEqualTo("2025-26");
    assertThat(PurchaseOrderPolicy.poNumber("2026-27", "BR01", 1))
        .isEqualTo("PO/2026-27/BR01/00001");
  }
}
