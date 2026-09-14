package com.nammamedmate.server.domain;

import com.nammamedmate.server.shared.exception.ApiException;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import org.springframework.http.HttpStatus;

public final class ExpensePolicy {

  public static final String INVALID_AMOUNT = "INVALID_AMOUNT";
  public static final String INVALID_DATE = "INVALID_DATE";
  public static final String INVALID_CATEGORY = "INVALID_CATEGORY";
  public static final String CATEGORY_TAKEN = "CATEGORY_TAKEN";
  public static final String STALE_STATE = "STALE_STATE";
  public static final String FORBIDDEN = "FORBIDDEN";
  public static final String NOT_FOUND = "NOT_FOUND";
  public static final String UNSUPPORTED_FILE = "UNSUPPORTED_FILE";
  public static final String NO_ACTIVE_BRANCH = "NO_ACTIVE_BRANCH";

  public static final List<String> SYSTEM_CODES =
      List.of(
          "RENT",
          "ELECTRICITY",
          "SALARIES",
          "TELECOM",
          "STATIONERY",
          "REPAIR",
          "TRAVEL",
          "RAW_MATERIAL",
          "MARKETING",
          "BANK",
          "MISCELLANEOUS");

  public static final Map<String, String> SYSTEM_LABELS;

  private static final Pattern CUSTOM_CODE = Pattern.compile("^[A-Z][A-Z0-9_]{0,31}$");
  private static final Set<Integer> GST_PERCENTS = Set.of(0, 5, 12, 18, 28);

  static {
    Map<String, String> labels = new LinkedHashMap<>();
    labels.put("RENT", "Rent Expense");
    labels.put("ELECTRICITY", "Electricity Bill");
    labels.put("SALARIES", "Employee Salaries & Advances");
    labels.put("TELECOM", "Telephone & Internet Expense");
    labels.put("STATIONERY", "Printing and Stationery");
    labels.put("REPAIR", "Repair & Maintenance");
    labels.put("TRAVEL", "Transportation & Travel");
    labels.put("RAW_MATERIAL", "Raw Material");
    labels.put("MARKETING", "Marketing & Promotion");
    labels.put("BANK", "Bank Charges");
    labels.put("MISCELLANEOUS", "Miscellaneous");
    SYSTEM_LABELS = Map.copyOf(labels);
  }

  private ExpensePolicy() {}

  public static String normalizeCode(String code) {
    if (code == null) {
      return "";
    }
    return code.trim().toUpperCase(Locale.ROOT);
  }

  public static long requireAmountPaise(Long amountPaise) {
    if (amountPaise == null || amountPaise <= 0) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          INVALID_AMOUNT,
          "Amount must be a positive paise total.");
    }
    return amountPaise;
  }

  public static LocalDate requireOccurredOn(LocalDate occurredOn, LocalDate today) {
    if (occurredOn == null || occurredOn.isAfter(today)) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY, INVALID_DATE, "Occurred date must be today or earlier.");
    }
    return occurredOn;
  }

  public static void assertPeriodOpen(LocalDate occurredOn) {
    // Closed accounting periods are not configured in Phase 1 (M8-S01-AC05).
  }

  public static void assertNoApprovalThreshold(long amountPaise) {
    requireAmountPaise(amountPaise);
  }

  public static ExpensePostingStatus postedWriteStatus() {
    return ExpensePostingStatus.POSTED;
  }

  public static boolean countsTowardPostedReports(ExpensePostingStatus status) {
    return status == ExpensePostingStatus.POSTED;
  }

  public static ExpensePostingStatus parseListStatus(String raw) {
    if (raw == null || raw.isBlank()) {
      return ExpensePostingStatus.POSTED;
    }
    try {
      return ExpensePostingStatus.valueOf(raw.trim().toUpperCase(Locale.ROOT));
    } catch (RuntimeException ex) {
      throw shape();
    }
  }

  public static String requireCustomCode(String code) {
    String normalized = normalizeCode(code);
    if (normalized.isEmpty()) {
      throw shape();
    }
    if (SYSTEM_CODES.contains(normalized)) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          CATEGORY_TAKEN,
          "That category is already on the books.");
    }
    if (!CUSTOM_CODE.matcher(normalized).matches()) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          INVALID_CATEGORY,
          "Category code needs letters or digits.");
    }
    return normalized;
  }

  public static String requireLabel(String label) {
    String cleaned = label == null ? "" : label.trim();
    if (cleaned.isEmpty() || cleaned.length() > 80) {
      throw shape();
    }
    return cleaned;
  }

  public static String requireIdempotencyKey(String key) {
    if (key == null || key.isBlank()) {
      return null;
    }
    String trimmed = key.trim();
    if (trimmed.length() > 128) {
      throw shape();
    }
    return trimmed;
  }

  public static String requireNotes(String notes) {
    if (notes == null || notes.isBlank()) {
      return null;
    }
    String trimmed = notes.trim();
    if (trimmed.length() > 500) {
      throw shape();
    }
    return trimmed;
  }

  public static String requirePartyName(String partyName) {
    if (partyName == null || partyName.isBlank()) {
      return null;
    }
    String trimmed = partyName.trim();
    if (trimmed.length() > 120) {
      throw shape();
    }
    return trimmed;
  }

  public static ExpensePaymentMode requirePaymentMode(ExpensePaymentMode mode) {
    return mode == null ? ExpensePaymentMode.CASH : mode;
  }

  public static int requireGstPercent(Integer gstPercent) {
    int value = gstPercent == null ? 0 : gstPercent;
    if (!GST_PERCENTS.contains(value)) {
      throw shape();
    }
    return value;
  }

  /** Amount is GST-inclusive; returns the GST portion in paise. */
  public static long gstPaiseFromInclusive(long amountPaise, int gstPercent) {
    if (gstPercent <= 0) {
      return 0L;
    }
    return amountPaise * gstPercent / (100L + gstPercent);
  }

  public static String formatExpenseNo(long sequence) {
    return "EXP-" + sequence;
  }

  public static void requireVersion(int current, Integer expected) {
    if (expected == null || expected != current) {
      throw new ApiException(
          HttpStatus.CONFLICT, STALE_STATE, "This spend was updated. Reload and try again.");
    }
  }

  public static ApiException notFound() {
    return new ApiException(HttpStatus.NOT_FOUND, NOT_FOUND, "Expense not found.");
  }

  public static ApiException forbidden() {
    return new ApiException(HttpStatus.FORBIDDEN, FORBIDDEN, "Forbidden");
  }

  public static ApiException unsupportedFile() {
    return new ApiException(
        HttpStatus.UNPROCESSABLE_ENTITY, UNSUPPORTED_FILE, "Upload a PDF, JPEG, or PNG receipt.");
  }

  public static ApiException noActiveBranch() {
    return new ApiException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        NO_ACTIVE_BRANCH,
        "Select an outlet before recording spend.");
  }

  public static ApiException invalidCategory() {
    return new ApiException(
        HttpStatus.UNPROCESSABLE_ENTITY, INVALID_CATEGORY, "Pick a category from the shop books.");
  }

  public static ApiException categoryTaken() {
    return new ApiException(
        HttpStatus.UNPROCESSABLE_ENTITY, CATEGORY_TAKEN, "That category is already on the books.");
  }

  public static ApiException shape() {
    return new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
  }
}
