package com.nammamedmate.server.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.nammamedmate.server.shared.exception.ApiException;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;

class InvoicePricingPolicyTest {

  @Test
  void ac01_percentAndFlatLineAndBillDiscountApplyBeforeGst() {
    InvoicePolicy.PricedBill bill =
        InvoicePolicy.priceBill(
            List.of(
                new InvoicePolicy.LinePriceInput(
                    new BigDecimal("10"),
                    10000L,
                    DiscountType.PERCENT,
                    1000L,
                    new BigDecimal("12")),
                new InvoicePolicy.LinePriceInput(
                    new BigDecimal("1"), 50000L, DiscountType.FLAT, 5000L, new BigDecimal("12"))),
            DiscountType.PERCENT,
            500L,
            TaxJurisdiction.INTRA);
    assertThat(bill.grossPaise()).isEqualTo(150000L);
    assertThat(bill.discountPaise()).isEqualTo(21750L);
    assertThat(bill.subtotalPaise()).isEqualTo(128250L);
    assertThat(bill.taxPaise()).isEqualTo(15390L);
    assertThat(bill.cgstPaise() + bill.sgstPaise()).isEqualTo(15390L);
    assertThat(bill.igstPaise()).isEqualTo(0L);
    assertThat(bill.totalPaise()).isEqualTo(143640L);
    assertThat(bill.effectiveDiscountBps()).isEqualTo(1450);
  }

  @Test
  void ac01_flatBillDiscountAllocatesAcrossLines() {
    InvoicePolicy.PricedBill bill =
        InvoicePolicy.priceBill(
            List.of(
                new InvoicePolicy.LinePriceInput(
                    new BigDecimal("1"), 10000L, DiscountType.NONE, 0L, new BigDecimal("12")),
                new InvoicePolicy.LinePriceInput(
                    new BigDecimal("1"), 30000L, DiscountType.NONE, 0L, new BigDecimal("12"))),
            DiscountType.FLAT,
            4000L,
            TaxJurisdiction.INTRA);
    assertThat(bill.lines().get(0).billDiscountPaise()).isEqualTo(1000L);
    assertThat(bill.lines().get(1).billDiscountPaise()).isEqualTo(3000L);
    assertThat(bill.discountPaise()).isEqualTo(4000L);
    assertThat(bill.subtotalPaise()).isEqualTo(36000L);
  }

  @Test
  void ac03_intraSplitsCgstSgstAndInterUsesIgst() {
    InvoicePolicy.LinePriceInput line =
        new InvoicePolicy.LinePriceInput(
            new BigDecimal("1"), 10000L, DiscountType.NONE, 0L, new BigDecimal("18"));
    InvoicePolicy.PricedBill intra =
        InvoicePolicy.priceBill(List.of(line), DiscountType.NONE, 0L, TaxJurisdiction.INTRA);
    assertThat(intra.lines().get(0).cgstPaise()).isEqualTo(900L);
    assertThat(intra.lines().get(0).sgstPaise()).isEqualTo(900L);
    assertThat(intra.lines().get(0).igstPaise()).isEqualTo(0L);
    InvoicePolicy.PricedBill inter =
        InvoicePolicy.priceBill(List.of(line), DiscountType.NONE, 0L, TaxJurisdiction.INTER);
    assertThat(inter.lines().get(0).cgstPaise()).isEqualTo(0L);
    assertThat(inter.lines().get(0).sgstPaise()).isEqualTo(0L);
    assertThat(inter.lines().get(0).igstPaise()).isEqualTo(1800L);
  }

  @Test
  void ac03_jurisdictionFromGstinStateCodes() {
    assertThat(InvoicePolicy.jurisdiction("29ABCDE1234F1Z5", null))
        .isEqualTo(TaxJurisdiction.INTRA);
    assertThat(InvoicePolicy.jurisdiction("29ABCDE1234F1Z5", "29AAAAA0000A1Z5"))
        .isEqualTo(TaxJurisdiction.INTRA);
    assertThat(InvoicePolicy.jurisdiction("29ABCDE1234F1Z5", "27AAAAA0000A1Z5"))
        .isEqualTo(TaxJurisdiction.INTER);
  }

  @Test
  void ac05_excessiveDiscountAndMissingBranchGstinFail() {
    assertThatThrownBy(
            () ->
                InvoicePolicy.priceBill(
                    List.of(
                        new InvoicePolicy.LinePriceInput(
                            new BigDecimal("1"),
                            10000L,
                            DiscountType.FLAT,
                            10001L,
                            new BigDecimal("12"))),
                    DiscountType.NONE,
                    0L,
                    TaxJurisdiction.INTRA))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(InvoicePolicy.EXCESSIVE_DISCOUNT);
    assertThatThrownBy(() -> InvoicePolicy.jurisdiction(null, "27AAAAA0000A1Z5"))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(InvoicePolicy.JURISDICTION_INVALID);
    assertThatThrownBy(() -> InvoicePolicy.requireGstRate(new BigDecimal("7")))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(InvoicePolicy.TAX_RATE_INVALID);
    assertThat(InvoicePolicy.discountExceedsThreshold(1001, 1000)).isTrue();
    assertThat(InvoicePolicy.discountExceedsThreshold(1000, 1000)).isFalse();
  }
}
