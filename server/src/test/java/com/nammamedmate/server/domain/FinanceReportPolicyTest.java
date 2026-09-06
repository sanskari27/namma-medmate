package com.nammamedmate.server.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.nammamedmate.server.shared.exception.ApiException;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class FinanceReportPolicyTest {

  private static final Instant NOW = Instant.parse("2026-09-06T06:00:00Z");

  @Test
  void catalogListsCoreFinanceBooksWithoutJournalsOrTdsOrDrawer() {
    assertThat(FinanceReportPolicy.catalog())
        .extracting(FinanceReportKey::name)
        .containsExactly(
            "DAY_BOOK",
            "SALES_SUMMARY",
            "PURCHASE_SUMMARY",
            "EXPENSE_SUMMARY",
            "PROFIT_AND_LOSS",
            "GSTR1",
            "GSTR3B",
            "BRANCH_PNL")
        .doesNotContain(
            "TDS",
            "CASH_DRAWER",
            "TRIAL_BALANCE",
            "BALANCE_SHEET",
            "CHART_OF_ACCOUNTS",
            "TALLY_EXPORT");
  }

  @Test
  void ac01_profitIsRevenueMinusPurchasePriceCogsMinusExpenses() {
    assertThat(FinanceReportPolicy.profitPaise(11_200L, 5_000L, 2_000L)).isEqualTo(4_200L);
    assertThat(FinanceReportPolicy.profitPaise(11_200L, 12_500L, 1_500L)).isEqualTo(-2_800L);
    assertThat(FinanceReportPolicy.cogsPaise(BigDecimal.ONE, 5_000L, true)).isEqualTo(5_000L);
    assertThat(FinanceReportPolicy.cogsPaise(BigDecimal.ONE, 5_000L, false)).isEqualTo(-5_000L);
    assertThat(FinanceReportPolicy.cogsPaise(BigDecimal.ONE, null, true)).isZero();
    assertThat(FinanceReportPolicy.saleIssue("sale:abc:line")).isTrue();
    assertThat(FinanceReportPolicy.saleIssue("adj:abc")).isFalse();
    assertThat(FinanceReportPolicy.salesReturnRestock("sales-return:r1:line")).isTrue();
  }

  @Test
  void ac02_gstinPresentIsB2bOtherwiseB2csAndItcAllocatesAcceptedQty() {
    assertThat(FinanceReportPolicy.b2b("29ABCDE1234F1Z5")).isTrue();
    assertThat(FinanceReportPolicy.b2b(null)).isFalse();
    assertThat(FinanceReportPolicy.b2b("  ")).isFalse();
    assertThat(FinanceReportPolicy.allocateTax(1_800L, new BigDecimal("10"), new BigDecimal("10")))
        .isEqualTo(1_800L);
    assertThat(FinanceReportPolicy.allocateTax(1_800L, new BigDecimal("5"), new BigDecimal("10")))
        .isEqualTo(900L);
    assertThat(FinanceReportPolicy.proportion(5_600L, 11_200L, 1_200L)).isEqualTo(600L);
  }

  @Test
  void unknownTdsDrawerAndCoaKeysStayUndisclosed() {
    assertThatThrownBy(() -> FinanceReportPolicy.requireKey("TDS"))
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(FinanceReportPolicy.NOT_FOUND);
    assertThatThrownBy(() -> FinanceReportPolicy.requireKey("CASH_DRAWER"))
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(FinanceReportPolicy.NOT_FOUND);
    assertThatThrownBy(() -> FinanceReportPolicy.requireKey("TRIAL_BALANCE"))
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(FinanceReportPolicy.NOT_FOUND);
    assertThat(FinanceReportPolicy.requireKey("gstr1")).isEqualTo(FinanceReportKey.GSTR1);
  }

  @Test
  void formatAllowsCsvAndPdfOnly() {
    assertThat(FinanceReportPolicy.requireFormat(null)).isEqualTo("csv");
    assertThat(FinanceReportPolicy.requireFormat("PDF")).isEqualTo("pdf");
    assertThatThrownBy(() -> FinanceReportPolicy.requireFormat("xlsx"))
        .extracting(ex -> ((ApiException) ex).getStatus().value())
        .isEqualTo(400);
    assertThatThrownBy(() -> FinanceReportPolicy.requireFormat("tally"))
        .extracting(ex -> ((ApiException) ex).getStatus().value())
        .isEqualTo(400);
  }

  @Test
  void rangeCapDefaultWindowAndFutureDates() {
    LocalDate[] window = FinanceReportPolicy.resolveWindow(null, null, NOW);
    assertThat(window[1]).isEqualTo(LocalDate.of(2026, 9, 6));
    assertThat(window[0]).isEqualTo(LocalDate.of(2026, 8, 7));
    assertThatThrownBy(
            () ->
                FinanceReportPolicy.resolveWindow(
                    LocalDate.of(2024, 1, 1), LocalDate.of(2026, 1, 10), NOW))
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(FinanceReportPolicy.RANGE_UNSUPPORTED);
    assertThatThrownBy(
            () ->
                FinanceReportPolicy.resolveWindow(
                    LocalDate.of(2026, 9, 10), LocalDate.of(2026, 9, 1), NOW))
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(FinanceReportPolicy.RANGE_UNSUPPORTED);
    assertThatThrownBy(
            () ->
                FinanceReportPolicy.resolveWindow(
                    LocalDate.of(2026, 9, 6), LocalDate.of(2026, 9, 7), NOW))
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(FinanceReportPolicy.FUTURE_AS_OF);
    assertThatThrownBy(() -> FinanceReportPolicy.resolveWindow(LocalDate.of(2026, 9, 1), null, NOW))
        .extracting(ex -> ((ApiException) ex).getStatus().value())
        .isEqualTo(400);
  }

  @Test
  void exportSizeCap() {
    FinanceReportPolicy.requireExportSize(10_000);
    assertThatThrownBy(() -> FinanceReportPolicy.requireExportSize(10_001))
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(FinanceReportPolicy.EXPORT_TOO_LARGE);
  }
}
