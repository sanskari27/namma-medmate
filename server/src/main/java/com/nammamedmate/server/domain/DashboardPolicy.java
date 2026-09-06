package com.nammamedmate.server.domain;

import com.nammamedmate.server.shared.exception.ApiException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.springframework.http.HttpStatus;

public final class DashboardPolicy {

  public static final ZoneId IST = ZoneId.of("Asia/Kolkata");
  public static final String FORBIDDEN = "FORBIDDEN";
  public static final String NOT_FOUND = "NOT_FOUND";
  public static final String NO_ACTIVE_BRANCH = "NO_ACTIVE_BRANCH";
  public static final String VALIDATION_ERROR = "VALIDATION_ERROR";
  public static final String SCOPE_BRANCH = "branch";
  public static final String SCOPE_TENANT = "tenant";
  public static final String SALES_HREF = "/pos";
  public static final String STOCK_HREF = "/inventory";
  public static final String TRANSFERS_HREF = "/inventory";
  public static final String GRN_HREF = "/purchases";
  public static final String AGING_HREF = "/aging";
  public static final String EXPENSES_HREF = "/expenses";

  private DashboardPolicy() {}

  public static List<DashboardRole> permitted(
      AppUserRole accountClass, Set<ModuleCode> modules, boolean accountantDesk) {
    LinkedHashSet<DashboardRole> roles = new LinkedHashSet<>();
    if (accountClass == AppUserRole.pharmacy_owner) {
      roles.add(DashboardRole.OWNER);
      roles.add(DashboardRole.CASHIER);
      roles.add(DashboardRole.INVENTORY);
      roles.add(DashboardRole.ACCOUNTANT);
      return List.copyOf(roles);
    }
    if (accountClass != AppUserRole.pharmacy_staff) {
      return List.of();
    }
    Set<ModuleCode> source = modules == null ? Set.of() : modules;
    if (source.contains(ModuleCode.SALES)) {
      roles.add(DashboardRole.CASHIER);
    }
    if (source.contains(ModuleCode.INVENTORY)) {
      roles.add(DashboardRole.INVENTORY);
    }
    if (FinanceAccessPolicy.allows(
        accountClass, accountantDesk, source.contains(ModuleCode.FINANCE))) {
      roles.add(DashboardRole.ACCOUNTANT);
    }
    return List.copyOf(roles);
  }

  public static void requireOpen(
      DashboardRole requested,
      AppUserRole accountClass,
      Set<ModuleCode> modules,
      boolean accountantDesk) {
    if (!permitted(accountClass, modules, accountantDesk).contains(requested)) {
      throw forbidden();
    }
  }

  public static DashboardRole requireRole(String raw) {
    if (raw == null || raw.isBlank()) {
      throw shape();
    }
    try {
      return DashboardRole.valueOf(raw.trim().toUpperCase(Locale.ROOT));
    } catch (IllegalArgumentException ex) {
      throw shape();
    }
  }

  public static String requireScope(DashboardRole role, String raw) {
    if (raw == null || raw.isBlank()) {
      return SCOPE_BRANCH;
    }
    String scope = raw.trim().toLowerCase(Locale.ROOT);
    if (SCOPE_BRANCH.equals(scope)) {
      return scope;
    }
    if (SCOPE_TENANT.equals(scope)) {
      if (role != DashboardRole.OWNER) {
        throw shape();
      }
      return scope;
    }
    throw shape();
  }

  public static LocalDate today(Instant now) {
    return now.atZone(IST).toLocalDate();
  }

  public static Instant startOfDay(LocalDate day) {
    return day.atStartOfDay(IST).toInstant();
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

  public static ApiException shape() {
    return new ApiException(HttpStatus.BAD_REQUEST, VALIDATION_ERROR, "Invalid request");
  }
}
