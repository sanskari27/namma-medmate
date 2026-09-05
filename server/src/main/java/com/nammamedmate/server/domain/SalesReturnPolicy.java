package com.nammamedmate.server.domain;

import com.nammamedmate.server.shared.exception.ApiException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.http.HttpStatus;

public final class SalesReturnPolicy {

  public static final String OVER_RETURN = "OVER_RETURN";
  public static final String NOT_RETURNABLE = "NOT_RETURNABLE";
  public static final String BATCH_EXPIRED = "BATCH_EXPIRED";
  public static final String LINES_REQUIRED = "LINES_REQUIRED";
  public static final String INVALID_QUANTITY = "INVALID_QUANTITY";
  public static final String REASON_REQUIRED = "REASON_REQUIRED";
  public static final String CREDIT_NOTE_CUSTOMER_REQUIRED = "CREDIT_NOTE_CUSTOMER_REQUIRED";
  public static final String INVOICE_NOT_COMPLETED = "INVOICE_NOT_COMPLETED";
  public static final String IDEMPOTENCY_CONFLICT = "IDEMPOTENCY_CONFLICT";

  private SalesReturnPolicy() {}

  public static String requireReason(String reason) {
    if (reason == null || reason.isBlank() || reason.trim().length() > 500) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          REASON_REQUIRED,
          "Say why this medicine is coming back.");
    }
    return reason.trim();
  }

  public static SalesReturnDecision requireDecision(String decision) {
    if (decision == null || decision.isBlank()) {
      return SalesReturnDecision.APPROVED;
    }
    if (!SalesReturnDecision.APPROVED.name().equalsIgnoreCase(decision.trim())) {
      throw validationError();
    }
    return SalesReturnDecision.APPROVED;
  }

  public static SalesReturnRefundMode requireRefundMode(String mode) {
    if (mode == null || mode.isBlank()) {
      throw validationError();
    }
    try {
      return SalesReturnRefundMode.valueOf(mode.trim().toUpperCase(Locale.ROOT));
    } catch (IllegalArgumentException ex) {
      throw validationError();
    }
  }

  public static void assertCreditNoteCustomer(SalesReturnRefundMode mode, UUID customerId) {
    if (mode == SalesReturnRefundMode.CREDIT_NOTE && customerId == null) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          CREDIT_NOTE_CUSTOMER_REQUIRED,
          "A credit note needs the khata customer from the original bill.");
    }
  }

  public static void assertLinesPresent(List<?> lines) {
    if (lines == null || lines.isEmpty()) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY, LINES_REQUIRED, "Add at least one return line.");
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

  public static void assertWithinNetSold(BigDecimal netSold, BigDecimal requested) {
    if (netSold == null || requested == null || requested.compareTo(netSold) > 0) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          OVER_RETURN,
          "Cannot take back more than what is still sold on this bill.");
    }
  }

  public static void assertProductReturnable(boolean returnable) {
    if (!returnable) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY, NOT_RETURNABLE, "This medicine cannot be taken back.");
    }
  }

  public static void assertBatchNotExpired(LocalDate expiresOn, LocalDate today) {
    if (expiresOn != null && today != null && expiresOn.isBefore(today)) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          BATCH_EXPIRED,
          "That batch has expired and cannot go back on the floor.");
    }
  }

  public static void assertInvoiceCompleted(SalesInvoiceStatus status) {
    if (status != SalesInvoiceStatus.COMPLETED) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          INVOICE_NOT_COMPLETED,
          "Only a collected bill can be returned against.");
    }
  }

  public static long refundAmountPaise(
      long lineTotalPaise, BigDecimal returnQuantity, BigDecimal soldQuantity) {
    if (lineTotalPaise < 0
        || returnQuantity == null
        || soldQuantity == null
        || soldQuantity.compareTo(BigDecimal.ZERO) <= 0) {
      throw validationError();
    }
    return BigDecimal.valueOf(lineTotalPaise)
        .multiply(returnQuantity)
        .divide(soldQuantity, 0, RoundingMode.HALF_UP)
        .longValueExact();
  }

  public static String requireIdempotencyKey(String key) {
    if (key == null || key.isBlank() || key.length() > 128) {
      throw validationError();
    }
    return key.trim();
  }

  public static ApiException idempotencyConflict() {
    return new ApiException(
        HttpStatus.CONFLICT,
        IDEMPOTENCY_CONFLICT,
        "This request was already used with a different payload.");
  }

  private static ApiException validationError() {
    return new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
  }
}
