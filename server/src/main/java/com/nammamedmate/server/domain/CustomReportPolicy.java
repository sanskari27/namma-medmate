package com.nammamedmate.server.domain;

import com.nammamedmate.server.shared.exception.ApiException;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.http.HttpStatus;

public final class CustomReportPolicy {

  public static final ZoneId IST = ZoneId.of("Asia/Kolkata");
  public static final int MAX_RANGE_DAYS = 366;
  public static final int MAX_PREVIEW_ROWS = 200;
  public static final int MAX_EXPORT_ROWS = 10_000;
  public static final int MAX_FILTERS = 8;
  public static final int MAX_COLUMNS = 12;
  public static final int MAX_CONTAINS_LEN = 80;
  public static final String PLAN_LIMIT = "PLAN_LIMIT";
  public static final String UNKNOWN_FIELD = "UNKNOWN_FIELD";
  public static final String UNKNOWN_OPERATOR = "UNKNOWN_OPERATOR";
  public static final String EXPORT_TOO_LARGE = "EXPORT_TOO_LARGE";
  public static final String RANGE_UNSUPPORTED = "RANGE_UNSUPPORTED";
  public static final String FORBIDDEN = "FORBIDDEN";
  public static final String NOT_FOUND = "NOT_FOUND";
  public static final String NO_ACTIVE_BRANCH = "NO_ACTIVE_BRANCH";
  public static final String VALIDATION_ERROR = "VALIDATION_ERROR";
  public static final String ACTION = "CUSTOM_REPORT_EXPORT";
  public static final String SCOPE_BRANCH = "branch";
  public static final String SCOPE_TENANT = "tenant";
  private static final Set<CustomReportOperator> TEXT_OPS =
      EnumSet.of(CustomReportOperator.EQ, CustomReportOperator.NEQ, CustomReportOperator.CONTAINS);
  private static final Set<CustomReportOperator> COMPARE_OPS =
      EnumSet.of(
          CustomReportOperator.EQ,
          CustomReportOperator.NEQ,
          CustomReportOperator.GT,
          CustomReportOperator.GTE,
          CustomReportOperator.LT,
          CustomReportOperator.LTE);
  private static final List<Field> FIELDS =
      List.of(
          field(
              "invoiceNumber",
              CustomReportDataset.SALES,
              CustomReportFieldKind.TEXT,
              "Bill number"),
          field("billedIst", CustomReportDataset.SALES, CustomReportFieldKind.DATE, "Billed (IST)"),
          field("branchCode", CustomReportDataset.SALES, CustomReportFieldKind.TEXT, "Outlet"),
          field("sku", CustomReportDataset.SALES, CustomReportFieldKind.TEXT, "SKU"),
          field("productName", CustomReportDataset.SALES, CustomReportFieldKind.TEXT, "Medicine"),
          field("quantity", CustomReportDataset.SALES, CustomReportFieldKind.NUMBER, "Qty"),
          field(
              "sellingPaise",
              CustomReportDataset.SALES,
              CustomReportFieldKind.MONEY,
              "Selling paise"),
          field("taxPaise", CustomReportDataset.SALES, CustomReportFieldKind.MONEY, "Tax paise"),
          field("customerName", CustomReportDataset.SALES, CustomReportFieldKind.TEXT, "Patient"),
          field(
              "occurredIst", CustomReportDataset.STOCK, CustomReportFieldKind.DATE, "Moved (IST)"),
          field("movementType", CustomReportDataset.STOCK, CustomReportFieldKind.TEXT, "Move"),
          field("sku", CustomReportDataset.STOCK, CustomReportFieldKind.TEXT, "SKU"),
          field("productName", CustomReportDataset.STOCK, CustomReportFieldKind.TEXT, "Medicine"),
          field("quantity", CustomReportDataset.STOCK, CustomReportFieldKind.NUMBER, "Qty"),
          field("batchNumber", CustomReportDataset.STOCK, CustomReportFieldKind.TEXT, "Batch"),
          field("branchCode", CustomReportDataset.STOCK, CustomReportFieldKind.TEXT, "Outlet"),
          field("name", CustomReportDataset.CUSTOMERS, CustomReportFieldKind.TEXT, "Patient"),
          field("phone", CustomReportDataset.CUSTOMERS, CustomReportFieldKind.TEXT, "Phone"),
          field(
              "createdIst",
              CustomReportDataset.CUSTOMERS,
              CustomReportFieldKind.DATE,
              "Added (IST)"),
          field("poNumber", CustomReportDataset.PURCHASES, CustomReportFieldKind.TEXT, "Indent"),
          field(
              "supplierName",
              CustomReportDataset.PURCHASES,
              CustomReportFieldKind.TEXT,
              "Stockist"),
          field("sku", CustomReportDataset.PURCHASES, CustomReportFieldKind.TEXT, "SKU"),
          field(
              "receivedQty",
              CustomReportDataset.PURCHASES,
              CustomReportFieldKind.NUMBER,
              "Received"),
          field(
              "receivedIst",
              CustomReportDataset.PURCHASES,
              CustomReportFieldKind.DATE,
              "Received (IST)"),
          field("branchCode", CustomReportDataset.PURCHASES, CustomReportFieldKind.TEXT, "Outlet"),
          field(
              "categoryCode",
              CustomReportDataset.EXPENSES,
              CustomReportFieldKind.TEXT,
              "Spend kind"),
          field(
              "amountPaise",
              CustomReportDataset.EXPENSES,
              CustomReportFieldKind.MONEY,
              "Amount paise"),
          field("spentIst", CustomReportDataset.EXPENSES, CustomReportFieldKind.DATE, "Spent on"),
          field("notes", CustomReportDataset.EXPENSES, CustomReportFieldKind.TEXT, "Notes"),
          field("branchCode", CustomReportDataset.EXPENSES, CustomReportFieldKind.TEXT, "Outlet"));

  private CustomReportPolicy() {}

  public record Field(
      String key, CustomReportDataset dataset, CustomReportFieldKind kind, String label) {}

  public record Window(LocalDate from, LocalDate to) {}

  public static List<Field> fields() {
    return FIELDS;
  }

  public static List<Field> fields(CustomReportDataset dataset) {
    List<Field> matched = new ArrayList<>();
    for (Field field : FIELDS) {
      if (field.dataset() == dataset) {
        matched.add(field);
      }
    }
    return List.copyOf(matched);
  }

  public static List<CustomReportDataset> datasets() {
    return List.of(CustomReportDataset.values());
  }

  public static List<CustomReportOperator> operators() {
    return List.of(CustomReportOperator.values());
  }

  public static CustomReportDataset requireDataset(String raw) {
    if (raw == null || raw.isBlank()) {
      throw shape();
    }
    try {
      return CustomReportDataset.valueOf(raw.trim().toUpperCase(Locale.ROOT));
    } catch (IllegalArgumentException ex) {
      throw unknownField();
    }
  }

  public static Field requireField(CustomReportDataset dataset, String raw) {
    if (raw == null || raw.isBlank() || looksInjected(raw)) {
      throw unknownField();
    }
    String key = raw.trim();
    for (Field field : FIELDS) {
      if (field.dataset() == dataset && field.key().equals(key)) {
        return field;
      }
    }
    throw unknownField();
  }

  public static List<Field> requireColumns(CustomReportDataset dataset, List<String> columns) {
    if (columns == null || columns.isEmpty()) {
      throw shape();
    }
    if (columns.size() > MAX_COLUMNS) {
      throw rangeUnsupported();
    }
    Map<String, Field> unique = new LinkedHashMap<>();
    for (String column : columns) {
      Field field = requireField(dataset, column);
      unique.putIfAbsent(field.key(), field);
    }
    return List.copyOf(unique.values());
  }

  public static CustomReportOperator requireOperator(CustomReportFieldKind kind, String raw) {
    if (raw == null || raw.isBlank() || looksInjected(raw)) {
      throw unknownOperator();
    }
    CustomReportOperator operator;
    try {
      operator = CustomReportOperator.valueOf(raw.trim().toUpperCase(Locale.ROOT));
    } catch (IllegalArgumentException ex) {
      throw unknownOperator();
    }
    Set<CustomReportOperator> allowed = kind == CustomReportFieldKind.TEXT ? TEXT_OPS : COMPARE_OPS;
    if (!allowed.contains(operator)) {
      throw unknownOperator();
    }
    return operator;
  }

  public static String requireFilterValue(CustomReportOperator operator, String raw) {
    if (raw == null) {
      throw shape();
    }
    String value = raw.trim();
    if (value.isEmpty()) {
      throw shape();
    }
    if (operator == CustomReportOperator.CONTAINS && value.length() > MAX_CONTAINS_LEN) {
      throw rangeUnsupported();
    }
    return value;
  }

  public static void requireFilterCount(int count) {
    if (count < 0 || count > MAX_FILTERS) {
      throw rangeUnsupported();
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

  public static Window resolveWindow(LocalDate from, LocalDate to, Instant now) {
    if (from == null || to == null) {
      throw shape();
    }
    LocalDate today = today(now);
    if (from.isAfter(to)) {
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
    return new Window(from, to);
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

  public static void assertEntitled(PlanCode plan) {
    ReportAccessPolicy.assertEntitled(plan, ReportCapability.CUSTOM_REPORT);
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

  public static void requireExportSize(int rows) {
    if (rows > MAX_EXPORT_ROWS) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          EXPORT_TOO_LARGE,
          "Narrow the date range. This report is too large to export in one file.");
    }
  }

  public static int previewLimit(int rows) {
    return Math.min(rows, MAX_PREVIEW_ROWS);
  }

  public static boolean previewTruncated(int rows) {
    return rows > MAX_PREVIEW_ROWS;
  }

  public static String escapeCell(String raw) {
    if (raw == null || raw.isEmpty()) {
      return "";
    }
    char first = raw.charAt(0);
    if (first == '='
        || first == '+'
        || first == '-'
        || first == '@'
        || first == '\t'
        || first == '\r') {
      return "'" + raw;
    }
    return raw;
  }

  public static String csvCell(String raw) {
    String escaped = escapeCell(raw);
    if (escaped.indexOf(',') >= 0
        || escaped.indexOf('"') >= 0
        || escaped.indexOf('\n') >= 0
        || escaped.indexOf('\r') >= 0) {
      return "\"" + escaped.replace("\"", "\"\"") + "\"";
    }
    return escaped;
  }

  public static boolean looksInjected(String raw) {
    if (raw == null) {
      return true;
    }
    String value = raw.trim();
    if (value.isEmpty()) {
      return true;
    }
    char first = value.charAt(0);
    if (first == '=' || first == '+' || first == '@') {
      return true;
    }
    String upper = value.toUpperCase(Locale.ROOT);
    return upper.contains("SUM(")
        || upper.contains("SELECT ")
        || upper.contains(" DROP ")
        || upper.contains(";")
        || upper.contains("--");
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

  public static ApiException unknownField() {
    return new ApiException(
        HttpStatus.UNPROCESSABLE_ENTITY, UNKNOWN_FIELD, "That column is not on this report.");
  }

  public static ApiException unknownOperator() {
    return new ApiException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        UNKNOWN_OPERATOR,
        "That filter is not allowed on this column.");
  }

  public static ApiException rangeUnsupported() {
    return new ApiException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        RANGE_UNSUPPORTED,
        "Use a date range of 366 days or less, with from before to.");
  }

  public static ApiException shape() {
    return new ApiException(HttpStatus.BAD_REQUEST, VALIDATION_ERROR, "Invalid request");
  }

  private static Field field(
      String key, CustomReportDataset dataset, CustomReportFieldKind kind, String label) {
    return new Field(key, dataset, kind, label);
  }
}
