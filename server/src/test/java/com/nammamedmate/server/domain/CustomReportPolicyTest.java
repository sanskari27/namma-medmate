package com.nammamedmate.server.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.nammamedmate.server.shared.exception.ApiException;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;

class CustomReportPolicyTest {

  @Test
  void ac01_onlyAllowlistedFieldsAndOperatorsAreAvailable() {
    assertThat(CustomReportPolicy.datasets())
        .containsExactly(
            CustomReportDataset.SALES,
            CustomReportDataset.STOCK,
            CustomReportDataset.CUSTOMERS,
            CustomReportDataset.PURCHASES,
            CustomReportDataset.EXPENSES);
    assertThat(CustomReportPolicy.fields(CustomReportDataset.SALES))
        .extracting(CustomReportPolicy.Field::key)
        .containsExactly(
            "invoiceNumber",
            "billedIst",
            "branchCode",
            "sku",
            "productName",
            "quantity",
            "sellingPaise",
            "taxPaise",
            "customerName");
    CustomReportPolicy.Field product =
        CustomReportPolicy.requireField(CustomReportDataset.SALES, "productName");
    assertThat(CustomReportPolicy.requireOperator(product.kind(), "CONTAINS"))
        .isEqualTo(CustomReportOperator.CONTAINS);
    assertThatThrownBy(
            () -> CustomReportPolicy.requireField(CustomReportDataset.SALES, "passwordHash"))
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(CustomReportPolicy.UNKNOWN_FIELD);
    assertThatThrownBy(() -> CustomReportPolicy.requireOperator(product.kind(), "LIKE"))
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(CustomReportPolicy.UNKNOWN_OPERATOR);
    assertThatThrownBy(
            () -> CustomReportPolicy.requireOperator(CustomReportFieldKind.MONEY, "CONTAINS"))
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(CustomReportPolicy.UNKNOWN_OPERATOR);
  }

  @Test
  void ac02_exportFormatsAreCsvAndPdf() {
    assertThat(CustomReportPolicy.requireFormat(null)).isEqualTo("csv");
    assertThat(CustomReportPolicy.requireFormat("PDF")).isEqualTo("pdf");
    assertThatThrownBy(() -> CustomReportPolicy.requireFormat("xlsx"))
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(CustomReportPolicy.VALIDATION_ERROR);
  }

  @Test
  void ac03_catalogHasNoScheduleDelivery() {
    assertThat(CustomReportPolicy.fields())
        .extracting(CustomReportPolicy.Field::key)
        .doesNotContain("schedule", "cron", "deliveryAt");
    assertThat(CustomReportPolicy.operators()).doesNotContainNull();
  }

  @Test
  void ac04_queriesAreResourceBounded() {
    Instant now = Instant.parse("2026-09-06T02:00:00Z");
    CustomReportPolicy.Window window =
        CustomReportPolicy.resolveWindow(LocalDate.of(2026, 9, 1), LocalDate.of(2026, 9, 6), now);
    assertThat(window.from()).isEqualTo(LocalDate.of(2026, 9, 1));
    CustomReportPolicy.requireFilterCount(8);
    CustomReportPolicy.requireColumns(
        CustomReportDataset.SALES, List.of("invoiceNumber", "productName"));
    assertThat(CustomReportPolicy.previewLimit(250)).isEqualTo(200);
    assertThat(CustomReportPolicy.previewTruncated(201)).isTrue();
    assertThatThrownBy(() -> CustomReportPolicy.requireExportSize(10_001))
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(CustomReportPolicy.EXPORT_TOO_LARGE);
    assertThatThrownBy(
            () ->
                CustomReportPolicy.resolveWindow(
                    LocalDate.of(2024, 1, 1), LocalDate.of(2026, 1, 10), now))
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(CustomReportPolicy.RANGE_UNSUPPORTED);
    assertThatThrownBy(() -> CustomReportPolicy.requireFilterCount(9))
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(CustomReportPolicy.RANGE_UNSUPPORTED);
  }

  @Test
  void ac05_unknownUnsafeExcessiveAndPlanAreRejected() {
    CustomReportPolicy.assertEntitled(PlanCode.GROWTH);
    CustomReportPolicy.assertEntitled(PlanCode.PRO);
    assertThatThrownBy(() -> CustomReportPolicy.assertEntitled(PlanCode.FREE))
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(CustomReportPolicy.PLAN_LIMIT);
    CustomReportPolicy.requireAccess(AppUserRole.pharmacy_owner, Set.of());
    CustomReportPolicy.requireAccess(AppUserRole.pharmacy_staff, Set.of(ModuleCode.REPORTING));
    assertThatThrownBy(
            () ->
                CustomReportPolicy.requireAccess(
                    AppUserRole.pharmacy_staff, Set.of(ModuleCode.SALES)))
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(CustomReportPolicy.FORBIDDEN);
    assertThatThrownBy(() -> CustomReportPolicy.requireField(CustomReportDataset.SALES, "=SUM(A1)"))
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(CustomReportPolicy.UNKNOWN_FIELD);
    assertThat(CustomReportPolicy.escapeCell("=CMD()")).isEqualTo("'=CMD()");
    assertThat(CustomReportPolicy.escapeCell("+1")).isEqualTo("'+1");
    assertThat(CustomReportPolicy.escapeCell("Pack")).isEqualTo("Pack");
    assertThat(CustomReportPolicy.csvCell("=1+1")).isEqualTo("'=1+1");
  }
}
