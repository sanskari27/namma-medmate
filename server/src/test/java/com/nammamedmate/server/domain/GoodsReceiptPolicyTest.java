package com.nammamedmate.server.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.nammamedmate.server.shared.exception.ApiException;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class GoodsReceiptPolicyTest {

  @Test
  void ac01_quantityMustBePositive() {
    assertThat(GoodsReceiptPolicy.assertQuantity(new BigDecimal("4"))).isEqualByComparingTo("4");
    assertThatThrownBy(() -> GoodsReceiptPolicy.assertQuantity(BigDecimal.ZERO))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(GoodsReceiptPolicy.INVALID_QUANTITY);
    assertThatThrownBy(() -> GoodsReceiptPolicy.assertQuantity(null))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(GoodsReceiptPolicy.INVALID_QUANTITY);
  }

  @Test
  void ac01_unitRateMustMatchPoLine() {
    GoodsReceiptPolicy.assertPriceMatch(10000L, 10000L);
    assertThatThrownBy(() -> GoodsReceiptPolicy.assertPriceMatch(10000L, 9900L))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(GoodsReceiptPolicy.PRICE_MISMATCH);
  }

  @Test
  void ac04_receivedCannotExceedOutstanding() {
    GoodsReceiptPolicy.assertNotOverReceipt(new BigDecimal("4"), new BigDecimal("10"));
    GoodsReceiptPolicy.assertNotOverReceipt(new BigDecimal("10"), new BigDecimal("10"));
    assertThatThrownBy(
            () ->
                GoodsReceiptPolicy.assertNotOverReceipt(new BigDecimal("11"), new BigDecimal("10")))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(GoodsReceiptPolicy.OVER_RECEIPT);
  }

  @Test
  void ac05_onlyIssuedPurchaseOrdersAcceptReceipts() {
    GoodsReceiptPolicy.assertIssued(PurchaseOrderStatus.ISSUED);
    assertThatThrownBy(() -> GoodsReceiptPolicy.assertIssued(PurchaseOrderStatus.DRAFT))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(GoodsReceiptPolicy.PO_NOT_ISSUED);
    assertThatThrownBy(() -> GoodsReceiptPolicy.assertIssued(PurchaseOrderStatus.CLOSED))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(PurchaseOrderPolicy.PO_CLOSED);
    assertThatThrownBy(() -> GoodsReceiptPolicy.assertIssued(PurchaseOrderStatus.CANCELLED))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(PurchaseOrderPolicy.PO_CLOSED);
  }

  @Test
  void ac05_receiptReferenceIsRequired() {
    assertThat(GoodsReceiptPolicy.requireReference(" CH-1 ")).isEqualTo("CH-1");
    assertThatThrownBy(() -> GoodsReceiptPolicy.requireReference(" "))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo("VALIDATION_ERROR");
  }

  @Test
  void ac01_formatsBranchGrnNumber() {
    assertThat(GoodsReceiptPolicy.financialYear(LocalDate.of(2026, 9, 5))).isEqualTo("2026-27");
    assertThat(GoodsReceiptPolicy.receiptNumber("2026-27", "BR01", 1))
        .isEqualTo("GRN/2026-27/BR01/00001");
  }
}
