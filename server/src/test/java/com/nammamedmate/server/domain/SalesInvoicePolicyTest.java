package com.nammamedmate.server.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.nammamedmate.server.shared.exception.ApiException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class SalesInvoicePolicyTest {

  @Test
  void ac01_formatsFinancialYearAndBranchInvoiceNumber() {
    assertThat(InvoicePolicy.financialYear(LocalDate.of(2026, 9, 5))).isEqualTo("2026-27");
    assertThat(InvoicePolicy.financialYear(LocalDate.of(2026, 3, 31))).isEqualTo("2025-26");
    assertThat(InvoicePolicy.invoiceNumber("2026-27", "BR01", 1))
        .isEqualTo("INV/2026-27/BR01/00001");
  }

  @Test
  void ac03_snapshotsLineGstAsEqualCgstSgstAndIgnoresClientTotals() {
    InvoicePolicy.LineMoney line =
        InvoicePolicy.lineMoney(new BigDecimal("10"), 10000L, 0L, new BigDecimal("12"));
    assertThat(line.taxablePaise()).isEqualTo(100000L);
    assertThat(line.taxPaise()).isEqualTo(12000L);
    assertThat(line.cgstPaise()).isEqualTo(6000L);
    assertThat(line.sgstPaise()).isEqualTo(6000L);
    assertThat(line.igstPaise()).isEqualTo(0L);
    assertThat(line.totalPaise()).isEqualTo(112000L);
    InvoicePolicy.HeaderMoney header = InvoicePolicy.headerMoney(List.of(line, line));
    assertThat(header.subtotalPaise()).isEqualTo(200000L);
    assertThat(header.taxPaise()).isEqualTo(24000L);
    assertThat(header.totalPaise()).isEqualTo(224000L);
  }

  @Test
  void ac02_walkInDoesNotRequireCustomerUntilControlled() {
    InvoicePolicy.requireControlledContext(false, null, null, false);
    assertThatThrownBy(
            () -> InvoicePolicy.requireControlledContext(true, null, UUID.randomUUID(), true))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(InvoicePolicy.INCOMPLETE_CONTROLLED);
  }

  @Test
  void ac05_staleStockInvalidUomPriceAndVersion() {
    InvoicePolicy.assertStockAvailable(new BigDecimal("10"), new BigDecimal("10"));
    assertThatThrownBy(
            () -> InvoicePolicy.assertStockAvailable(new BigDecimal("4"), new BigDecimal("5")))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(InvoicePolicy.STALE_STOCK);
    UUID productId = UUID.randomUUID();
    InvoicePolicy.assertBatchOnProduct(productId, productId);
    assertThatThrownBy(() -> InvoicePolicy.assertBatchOnProduct(UUID.randomUUID(), productId))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(InvoicePolicy.FOREIGN_BATCH);
    InvoicePolicy.assertVersion(1, 1);
    assertThatThrownBy(() -> InvoicePolicy.assertVersion(2, 1))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(InvoicePolicy.STALE_STATE);
    assertThatThrownBy(() -> InvoicePolicy.requirePrices(100, 101, 0))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(InvoicePolicy.PRICE_INVALID);
    assertThatThrownBy(() -> InvoicePolicy.requireQuantity(BigDecimal.ZERO, 2))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(InvoicePolicy.INVALID_QUANTITY);
  }
}
