package com.nammamedmate.server.domain;

import com.nammamedmate.server.shared.exception.ApiException;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import org.springframework.http.HttpStatus;

public final class ComplianceReportPolicy {

  public static final ZoneId IST = ZoneId.of("Asia/Kolkata");
  public static final int DEFAULT_WINDOW_DAYS = 30;
  public static final int MAX_RANGE_DAYS = 366;
  public static final int MAX_EXPORT_ROWS = 10_000;
  public static final String RANGE_UNSUPPORTED = "RANGE_UNSUPPORTED";
  public static final String EXPORT_TOO_LARGE = "EXPORT_TOO_LARGE";
  public static final String BATCH_REQUIRED = "BATCH_REQUIRED";
  public static final String NO_ACTIVE_BRANCH = "NO_ACTIVE_BRANCH";
  public static final String FORBIDDEN = "FORBIDDEN";
  public static final String NOT_FOUND = "NOT_FOUND";
  public static final String ACTION = "COMPLIANCE_EXPORT";

  private ComplianceReportPolicy() {}

  public static List<ComplianceReportKey> catalog() {
    return Arrays.asList(ComplianceReportKey.values());
  }

  public static ComplianceReportKey requireKey(String key) {
    if (key == null || key.isBlank()) {
      throw notFound();
    }
    try {
      return ComplianceReportKey.valueOf(key.trim().toUpperCase(Locale.ROOT));
    } catch (IllegalArgumentException ex) {
      throw notFound();
    }
  }

  public static String requireFormat(String format) {
    String kind =
        format == null || format.isBlank() ? "csv" : format.trim().toLowerCase(Locale.ROOT);
    if ("csv".equals(kind) || "pdf".equals(kind)) {
      return kind;
    }
    throw shape();
  }

  public static Instant[] resolveWindow(Instant from, Instant to, Instant now) {
    if (from == null && to == null) {
      ZonedDateTime end = now.atZone(IST);
      Instant start = end.minusDays(DEFAULT_WINDOW_DAYS).toInstant();
      return new Instant[] {start, now};
    }
    if (from == null || to == null) {
      throw shape();
    }
    if (from.isAfter(to)) {
      throw rangeUnsupported();
    }
    if (Duration.between(from, to).toDays() > MAX_RANGE_DAYS) {
      throw rangeUnsupported();
    }
    return new Instant[] {from, to};
  }

  public static void requireExportSize(int rows) {
    if (rows > MAX_EXPORT_ROWS) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          EXPORT_TOO_LARGE,
          "Narrow the date range. This outlet's register is too large to export in one file.");
    }
  }

  public static String requireBatchNumber(ComplianceReportKey key, String batchNumber) {
    if (key != ComplianceReportKey.TRACEABILITY) {
      return batchNumber == null || batchNumber.isBlank() ? null : batchNumber.trim();
    }
    if (batchNumber == null || batchNumber.isBlank()) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          BATCH_REQUIRED,
          "Enter a batch number to open the traceability book.");
    }
    return batchNumber.trim();
  }

  public static ApiException forbidden() {
    return new ApiException(HttpStatus.FORBIDDEN, FORBIDDEN, "Forbidden");
  }

  public static ApiException notFound() {
    return new ApiException(HttpStatus.NOT_FOUND, NOT_FOUND, "Register not found.");
  }

  public static ApiException noActiveBranch() {
    return new ApiException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        NO_ACTIVE_BRANCH,
        "Select an outlet before opening the register book.");
  }

  public static ApiException rangeUnsupported() {
    return new ApiException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        RANGE_UNSUPPORTED,
        "Use a date range of 366 days or less, with from before to.");
  }

  public static ApiException shape() {
    return new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
  }
}
