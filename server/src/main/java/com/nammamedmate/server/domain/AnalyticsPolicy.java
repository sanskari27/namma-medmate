package com.nammamedmate.server.domain;

import com.nammamedmate.server.shared.exception.ApiException;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.springframework.http.HttpStatus;

public final class AnalyticsPolicy {

  public static final ZoneId IST = ZoneId.of("Asia/Kolkata");
  public static final int MAX_RANGE_DAYS = 366;
  public static final int TOP_SELLERS_MAX = 10;
  public static final int SLOW_DEAD_MAX = 50;
  public static final int SLOW_UNITS_MAX = 5;
  public static final String PLAN_LIMIT = "PLAN_LIMIT";
  public static final String RANGE_UNSUPPORTED = "RANGE_UNSUPPORTED";
  public static final String FORBIDDEN = "FORBIDDEN";
  public static final String NOT_FOUND = "NOT_FOUND";
  public static final String NO_ACTIVE_BRANCH = "NO_ACTIVE_BRANCH";
  public static final String VALIDATION_ERROR = "VALIDATION_ERROR";
  public static final String CLASS_DEAD = "DEAD";
  public static final String CLASS_SLOW = "SLOW";
  public static final String FREQ_WALK_IN = "WALK_IN";
  public static final String FREQ_ONE = "VISITS_1";
  public static final String FREQ_TWO_THREE = "VISITS_2_3";
  public static final String FREQ_FOUR_PLUS = "VISITS_4_PLUS";
  public static final String SCOPE_BRANCH = "branch";
  public static final String SCOPE_TENANT = "tenant";

  private AnalyticsPolicy() {}

  public record Window(LocalDate from, LocalDate to, LocalDate priorFrom, LocalDate priorTo) {
    public long currentDays() {
      return ChronoUnit.DAYS.between(from, to) + 1;
    }

    public long priorDays() {
      return ChronoUnit.DAYS.between(priorFrom, priorTo) + 1;
    }
  }

  public static Window wow(LocalDate today) {
    LocalDate from = today.minusDays(today.getDayOfWeek().getValue() - 1L);
    LocalDate to = from.plusDays(6);
    return new Window(from, to, from.minusWeeks(1), to.minusWeeks(1));
  }

  public static Window mom(LocalDate today) {
    LocalDate from = today.withDayOfMonth(1);
    LocalDate to = today.withDayOfMonth(today.lengthOfMonth());
    LocalDate priorMonth = from.minusMonths(1);
    return new Window(
        from,
        to,
        priorMonth.withDayOfMonth(1),
        priorMonth.withDayOfMonth(priorMonth.lengthOfMonth()));
  }

  public static Window custom(
      LocalDate from, LocalDate to, LocalDate priorFrom, LocalDate priorTo, LocalDate today) {
    requireOrdered(from, to, today);
    requireOrdered(priorFrom, priorTo, today);
    Window window = new Window(from, to, priorFrom, priorTo);
    if (window.currentDays() != window.priorDays()) {
      throw rangeUnsupported();
    }
    return window;
  }

  public static Window resolve(
      String compareRaw,
      LocalDate from,
      LocalDate to,
      LocalDate priorFrom,
      LocalDate priorTo,
      Instant now) {
    LocalDate today = today(now);
    AnalyticsCompare compare = requireCompare(compareRaw);
    boolean custom = from != null || to != null || priorFrom != null || priorTo != null;
    if (custom) {
      if (from == null || to == null || priorFrom == null || priorTo == null) {
        throw shape();
      }
      return custom(from, to, priorFrom, priorTo, today);
    }
    return compare == AnalyticsCompare.MOM ? mom(today) : wow(today);
  }

  public static AnalyticsCompare requireCompare(String raw) {
    if (raw == null || raw.isBlank()) {
      return AnalyticsCompare.WOW;
    }
    try {
      return AnalyticsCompare.valueOf(raw.trim().toUpperCase(Locale.ROOT));
    } catch (IllegalArgumentException ex) {
      throw shape();
    }
  }

  public static String requireScope(AppUserRole role, String raw) {
    if (raw == null || raw.isBlank()) {
      return SCOPE_BRANCH;
    }
    String scope = raw.trim().toLowerCase(Locale.ROOT);
    if (SCOPE_BRANCH.equals(scope)) {
      return scope;
    }
    if (SCOPE_TENANT.equals(scope)) {
      if (role != AppUserRole.pharmacy_owner) {
        throw shape();
      }
      return scope;
    }
    throw shape();
  }

  public static int requireLimit(Integer limit) {
    if (limit == null) {
      return TOP_SELLERS_MAX;
    }
    if (limit < 1 || limit > TOP_SELLERS_MAX) {
      throw rangeUnsupported();
    }
    return limit;
  }

  public static void assertEntitled(PlanCode plan) {
    ReportAccessPolicy.assertEntitled(plan, ReportCapability.ANALYTICS);
  }

  public static void requireAccess(AppUserRole role, Set<ModuleCode> modules) {
    if (role == AppUserRole.pharmacy_owner) {
      return;
    }
    if (role == AppUserRole.pharmacy_staff
        && modules != null
        && modules.contains(ModuleCode.REPORTING)) {
      return;
    }
    throw forbidden();
  }

  public static List<String> chartKeys() {
    return List.of("salesTrend", "topSellers", "slowDeadStock", "customerFrequency");
  }

  public static String classify(BigDecimal onHand, long unitsSold) {
    if (onHand == null || onHand.compareTo(BigDecimal.ZERO) <= 0) {
      return null;
    }
    if (unitsSold <= 0) {
      return CLASS_DEAD;
    }
    if (unitsSold <= SLOW_UNITS_MAX) {
      return CLASS_SLOW;
    }
    return null;
  }

  public static LocalDate today(Instant now) {
    return now.atZone(IST).toLocalDate();
  }

  public static Instant startInstant(LocalDate from) {
    return from.atStartOfDay(IST).toInstant();
  }

  public static Instant endExclusive(LocalDate to) {
    return to.plusDays(1).atStartOfDay(IST).toInstant();
  }

  public static Integer salesPctBps(long currentPaise, long priorPaise) {
    if (priorPaise == 0L) {
      return null;
    }
    return Math.toIntExact(Math.round((currentPaise - priorPaise) * 10_000.0d / priorPaise));
  }

  public static ApiException forbidden() {
    return new ApiException(HttpStatus.FORBIDDEN, FORBIDDEN, "Forbidden");
  }

  public static ApiException notFound() {
    return new ApiException(HttpStatus.NOT_FOUND, NOT_FOUND, "Not found");
  }

  public static ApiException noActiveBranch() {
    return new ApiException(
        HttpStatus.UNPROCESSABLE_ENTITY, NO_ACTIVE_BRANCH, "Select an outlet first.");
  }

  public static ApiException rangeUnsupported() {
    return new ApiException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        RANGE_UNSUPPORTED,
        "Use matching week or month windows of 366 days or less.");
  }

  public static ApiException shape() {
    return new ApiException(HttpStatus.BAD_REQUEST, VALIDATION_ERROR, "Invalid request");
  }

  private static void requireOrdered(LocalDate from, LocalDate to, LocalDate today) {
    if (from == null || to == null || from.isAfter(to)) {
      throw rangeUnsupported();
    }
    if (from.isAfter(today) || to.isAfter(today)) {
      throw rangeUnsupported();
    }
    if (Duration.between(from.atStartOfDay(IST).toInstant(), to.atStartOfDay(IST).toInstant())
            .toDays()
        > MAX_RANGE_DAYS) {
      throw rangeUnsupported();
    }
  }
}
