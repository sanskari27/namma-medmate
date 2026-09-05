package com.nammamedmate.server.domain;

import com.nammamedmate.server.shared.exception.ApiException;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
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
      List.of("RENT", "ELECTRICITY", "SALARIES", "MISCELLANEOUS");

  public static final Map<String, String> SYSTEM_LABELS;

  private static final Pattern CUSTOM_CODE = Pattern.compile("^[A-Z][A-Z0-9_]{0,31}$");

  static {
    Map<String, String> labels = new LinkedHashMap<>();
    labels.put("RENT", "Rent");
    labels.put("ELECTRICITY", "Electricity");
    labels.put("SALARIES", "Salaries");
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
          HttpStatus.UNPROCESSABLE_ENTITY,
          INVALID_DATE,
          "Occurred date must be today or earlier.");
    }
    return occurredOn;
  }

  public static void assertPeriodOpen(LocalDate occurredOn) {
    // Closed accounting periods are not configured in Phase 1 (M8-S01-AC05).
  }

  public static String requireCustomCode(String code) {
    String normalized = normalizeCode(code);
    if (normalized.isEmpty()) {
      throw shape();
    }
    if (SYSTEM_CODES.contains(normalized)) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY, CATEGORY_TAKEN, "That category is already on the books.");
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
        HttpStatus.UNPROCESSABLE_ENTITY, NO_ACTIVE_BRANCH, "Select an outlet before recording spend.");
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
