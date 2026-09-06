package com.nammamedmate.server.domain;

import com.nammamedmate.server.shared.exception.ApiException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import org.springframework.http.HttpStatus;

public final class FinanceReportPolicy {

  public static final ZoneId IST = ZoneId.of("Asia/Kolkata");
  public static final int DEFAULT_WINDOW_DAYS = 30;
  public static final int MAX_RANGE_DAYS = 366;
  public static final int MAX_EXPORT_ROWS = 10_000;
  public static final String RANGE_UNSUPPORTED = "RANGE_UNSUPPORTED";
  public static final String FUTURE_AS_OF = "FUTURE_AS_OF";
  public static final String EXPORT_TOO_LARGE = "EXPORT_TOO_LARGE";
  public static final String NO_ACTIVE_BRANCH = "NO_ACTIVE_BRANCH";
  public static final String FORBIDDEN = "FORBIDDEN";
  public static final String NOT_FOUND = "NOT_FOUND";
  public static final String ACTION = "FINANCE_REPORT_EXPORT";
  public static final String SALE_STOCK_PREFIX = "sale:";
  public static final String RETURN_STOCK_PREFIX = "sales-return:";

  private FinanceReportPolicy() {}

  public static List<FinanceReportKey> catalog() {
    return Arrays.asList(FinanceReportKey.values());
  }

  public static FinanceReportKey requireKey(String key) {
    if (key == null || key.isBlank()) {
      throw notFound();
    }
    try {
      return FinanceReportKey.valueOf(key.trim().toUpperCase(Locale.ROOT));
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

  public static LocalDate today(Instant now) {
    return now.atZone(IST).toLocalDate();
  }

  public static LocalDate[] resolveWindow(LocalDate from, LocalDate to, Instant now) {
    LocalDate today = today(now);
    if (from == null && to == null) {
      return new LocalDate[] {today.minusDays(DEFAULT_WINDOW_DAYS), today};
    }
    if (from == null || to == null) {
      throw shape();
    }
    if (from.isAfter(to)) {
      throw rangeUnsupported();
    }
    if (from.isAfter(today) || to.isAfter(today)) {
      throw futureAsOf();
    }
    if (Duration.between(from.atStartOfDay(IST).toInstant(), to.atStartOfDay(IST).toInstant())
            .toDays()
        > MAX_RANGE_DAYS) {
      throw rangeUnsupported();
    }
    return new LocalDate[] {from, to};
  }

  public static Instant startInstant(LocalDate from) {
    return from.atStartOfDay(IST).toInstant();
  }

  public static Instant endExclusive(LocalDate to) {
    return to.plusDays(1).atStartOfDay(IST).toInstant();
  }

  public static Instant endInclusive(LocalDate to) {
    return to.atTime(LocalTime.MAX).atZone(IST).toInstant();
  }

  public static long profitPaise(long revenuePaise, long cogsPaise, long expensePaise) {
    return revenuePaise - cogsPaise - expensePaise;
  }

  public static long cogsPaise(BigDecimal quantity, Long purchasePricePaise, boolean outbound) {
    if (quantity == null || purchasePricePaise == null || purchasePricePaise <= 0) {
      return 0L;
    }
    long amount =
        quantity
            .multiply(BigDecimal.valueOf(purchasePricePaise))
            .setScale(0, RoundingMode.HALF_UP)
            .longValueExact();
    return outbound ? amount : -amount;
  }

  public static boolean saleIssue(String idempotencyKey) {
    return idempotencyKey != null && idempotencyKey.startsWith(SALE_STOCK_PREFIX);
  }

  public static boolean salesReturnRestock(String idempotencyKey) {
    return idempotencyKey != null && idempotencyKey.startsWith(RETURN_STOCK_PREFIX);
  }

  public static boolean b2b(String customerGstin) {
    return customerGstin != null && !customerGstin.isBlank();
  }

  public static long allocateTax(long lineTaxPaise, BigDecimal accepted, BigDecimal ordered) {
    if (accepted == null || ordered == null || ordered.compareTo(BigDecimal.ZERO) <= 0) {
      return 0L;
    }
    if (accepted.compareTo(BigDecimal.ZERO) <= 0) {
      return 0L;
    }
    return BigDecimal.valueOf(lineTaxPaise)
        .multiply(accepted)
        .divide(ordered, 0, RoundingMode.HALF_UP)
        .longValueExact();
  }

  public static long proportion(long part, long whole, long amount) {
    if (whole <= 0L || part <= 0L || amount == 0L) {
      return 0L;
    }
    return BigDecimal.valueOf(amount)
        .multiply(BigDecimal.valueOf(part))
        .divide(BigDecimal.valueOf(whole), 0, RoundingMode.HALF_UP)
        .longValueExact();
  }

  public static void requireExportSize(int rows) {
    if (rows > MAX_EXPORT_ROWS) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          EXPORT_TOO_LARGE,
          "Narrow the date range. This shop book is too large to export in one file.");
    }
  }

  public static ApiException forbidden() {
    return new ApiException(HttpStatus.FORBIDDEN, FORBIDDEN, "Forbidden");
  }

  public static ApiException notFound() {
    return new ApiException(HttpStatus.NOT_FOUND, NOT_FOUND, "Shop book not found.");
  }

  public static ApiException noActiveBranch() {
    return new ApiException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        NO_ACTIVE_BRANCH,
        "Select an outlet before opening shop books.");
  }

  public static ApiException rangeUnsupported() {
    return new ApiException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        RANGE_UNSUPPORTED,
        "Use a date range of 366 days or less, with from before to.");
  }

  public static ApiException futureAsOf() {
    return new ApiException(
        HttpStatus.UNPROCESSABLE_ENTITY, FUTURE_AS_OF, "Report dates must be today or earlier.");
  }

  public static ApiException shape() {
    return new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
  }
}
