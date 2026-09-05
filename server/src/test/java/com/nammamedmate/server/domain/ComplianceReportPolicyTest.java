package com.nammamedmate.server.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.nammamedmate.server.shared.exception.ApiException;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class ComplianceReportPolicyTest {

  private static final Instant NOW = Instant.parse("2026-09-06T06:00:00Z");

  @Test
  void catalogListsEveryPhase1Register() {
    assertThat(ComplianceReportPolicy.catalog())
        .extracting(ComplianceReportKey::name)
        .containsExactly(
            "H1_SALES",
            "PURCHASE",
            "PURCHASE_INVOICE",
            "SUPPLIER_LICENSE",
            "LICENSE_EXPIRY",
            "CONTROLLED_STOCK",
            "BATCH_STOCK",
            "EXPIRED",
            "DAMAGED",
            "SUPPLIER_RETURN",
            "STOCK_LOSS",
            "STOCK_VERIFICATION",
            "NEAR_EXPIRY",
            "TRACEABILITY",
            "SUPPLIER_PURCHASE",
            "PRODUCT_TRACE");
  }

  @Test
  void unknownKeyIsUndisclosed() {
    assertThatThrownBy(() -> ComplianceReportPolicy.requireKey("COLD_CHAIN"))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(ComplianceReportPolicy.NOT_FOUND);
  }

  @Test
  void formatAllowsCsvAndPdfOnly() {
    assertThat(ComplianceReportPolicy.requireFormat(null)).isEqualTo("csv");
    assertThat(ComplianceReportPolicy.requireFormat("PDF")).isEqualTo("pdf");
    assertThatThrownBy(() -> ComplianceReportPolicy.requireFormat("xlsx"))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getStatus().value())
        .isEqualTo(400);
  }

  @Test
  void rangeCapAndDefaultWindow() {
    Instant[] window = ComplianceReportPolicy.resolveWindow(null, null, NOW);
    assertThat(window[1]).isEqualTo(NOW);
    assertThat(window[0]).isBefore(NOW);
    assertThatThrownBy(
            () ->
                ComplianceReportPolicy.resolveWindow(
                    Instant.parse("2024-01-01T00:00:00Z"),
                    Instant.parse("2026-01-10T00:00:00Z"),
                    NOW))
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(ComplianceReportPolicy.RANGE_UNSUPPORTED);
    assertThatThrownBy(
            () ->
                ComplianceReportPolicy.resolveWindow(
                    Instant.parse("2026-09-06T00:00:00Z"),
                    Instant.parse("2026-09-01T00:00:00Z"),
                    NOW))
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(ComplianceReportPolicy.RANGE_UNSUPPORTED);
  }

  @Test
  void exportSizeAndTraceabilityBatch() {
    ComplianceReportPolicy.requireExportSize(10_000);
    assertThatThrownBy(() -> ComplianceReportPolicy.requireExportSize(10_001))
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(ComplianceReportPolicy.EXPORT_TOO_LARGE);
    assertThatThrownBy(
            () -> ComplianceReportPolicy.requireBatchNumber(ComplianceReportKey.TRACEABILITY, " "))
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(ComplianceReportPolicy.BATCH_REQUIRED);
    assertThat(ComplianceReportPolicy.requireBatchNumber(ComplianceReportKey.H1_SALES, null))
        .isNull();
  }
}
