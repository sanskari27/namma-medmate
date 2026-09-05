package com.nammamedmate.server.domain;

import com.nammamedmate.server.shared.exception.ApiException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import org.springframework.http.HttpStatus;

public final class PurchaseReturnPolicy {

  public static final String OVER_RETURN = "OVER_RETURN";
  public static final String OVERPAYMENT = "OVERPAYMENT";
  public static final String DUPLICATE_REFERENCE = "DUPLICATE_REFERENCE";
  public static final String STALE_STATE = "STALE_STATE";
  public static final String PLAN_LIMIT = "PLAN_LIMIT";
  public static final String LINES_REQUIRED = "LINES_REQUIRED";
  public static final String INVALID_QUANTITY = "INVALID_QUANTITY";
  public static final String IDEMPOTENCY_CONFLICT = "IDEMPOTENCY_CONFLICT";
  public static final String INSUFFICIENT_STOCK = "INSUFFICIENT_STOCK";

  private static final String GROWTH_MESSAGE =
      "Growth or Pro is required for stockist payment due reminders.";

  private PurchaseReturnPolicy() {}

  public static void assertDueRemindersEntitled(PlanCode plan) {
    if (plan != PlanCode.GROWTH && plan != PlanCode.PRO) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, PLAN_LIMIT, GROWTH_MESSAGE);
    }
  }

  public static BigDecimal assertQuantity(BigDecimal quantity) {
    if (quantity == null || quantity.compareTo(BigDecimal.ZERO) <= 0) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          INVALID_QUANTITY,
          "Return quantity must be greater than zero.");
    }
    return quantity.stripTrailingZeros();
  }

  public static void assertLinesPresent(List<?> lines) {
    if (lines == null || lines.isEmpty()) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY, LINES_REQUIRED, "Add at least one return line.");
    }
  }

  public static void assertReturnable(BigDecimal remaining, BigDecimal requested) {
    if (remaining == null || requested == null || requested.compareTo(remaining) > 0) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          OVER_RETURN,
          "Cannot return more than the remaining accepted quantity.");
    }
  }

  public static void assertPayment(long amountPaise, long balancePaise) {
    if (amountPaise <= 0) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
    if (amountPaise > balancePaise) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          OVERPAYMENT,
          "Payment exceeds what is still owed to this stockist.");
    }
  }

  public static void assertExpectedVersion(long actual, Long expected) {
    if (expected == null) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
    if (actual != expected) {
      throw new ApiException(
          HttpStatus.CONFLICT, STALE_STATE, "Stockist balance was updated by someone else.");
    }
  }

  public static long lineAmountPaise(BigDecimal quantity, long unitRatePaise) {
    if (unitRatePaise < 0) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
    return quantity
        .multiply(BigDecimal.valueOf(unitRatePaise))
        .setScale(0, RoundingMode.HALF_UP)
        .longValueExact();
  }

  public static LocalDate dueOn(
      LocalDate invoiceDateIst, SupplierPaymentTerms terms, Integer creditPeriodDays) {
    if (invoiceDateIst == null) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
    if (terms == SupplierPaymentTerms.CREDIT && creditPeriodDays != null && creditPeriodDays > 0) {
      return invoiceDateIst.plusDays(creditPeriodDays);
    }
    return invoiceDateIst;
  }

  public static String debitNoteNumber(String financialYear, String branchCode, int sequence) {
    return "DN/" + financialYear + "/" + branchCode + "/" + String.format("%05d", sequence);
  }

  public static String requireIdempotencyKey(String key) {
    if (key == null || key.isBlank() || key.length() > 128) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
    return key.trim();
  }

  public static String requirePaymentMode(String mode) {
    if (mode == null || mode.isBlank() || mode.length() > 64) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
    return mode.trim().toUpperCase(Locale.ROOT);
  }

  public static String requirePaymentReference(String reference) {
    if (reference == null || reference.isBlank() || reference.length() > 200) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
    return reference.trim();
  }

  public static ApiException duplicateReference() {
    return new ApiException(
        HttpStatus.CONFLICT,
        DUPLICATE_REFERENCE,
        "This payment reference was already recorded for this outlet.");
  }

  public static ApiException idempotencyConflict() {
    return new ApiException(
        HttpStatus.CONFLICT,
        IDEMPOTENCY_CONFLICT,
        "This request was already used with a different payload.");
  }

  public static ApiException insufficientStock() {
    return new ApiException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        INSUFFICIENT_STOCK,
        "Not enough floor stock to send this pack back.");
  }
}
