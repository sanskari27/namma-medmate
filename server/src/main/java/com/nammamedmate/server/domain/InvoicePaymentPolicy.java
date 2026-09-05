package com.nammamedmate.server.domain;

import com.nammamedmate.server.shared.exception.ApiException;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.http.HttpStatus;

public final class InvoicePaymentPolicy {

  public static final String UNDER_ALLOCATION = "UNDER_ALLOCATION";
  public static final String OVER_ALLOCATION = "OVER_ALLOCATION";
  public static final String INVALID_CHANGE = "INVALID_CHANGE";
  public static final String KHATA_REQUIRES_CUSTOMER = "KHATA_REQUIRES_CUSTOMER";
  public static final String DUPLICATE_COMPLETION = "DUPLICATE_COMPLETION";
  public static final String PARTS_REQUIRED = "PARTS_REQUIRED";
  public static final String INVALID_AMOUNT = "INVALID_AMOUNT";

  private InvoicePaymentPolicy() {}

  public static Allocation allocate(long totalPaise, long changePaise, List<Part> parts) {
    if (parts == null || parts.isEmpty()) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          PARTS_REQUIRED,
          "Add at least one payment on this bill.");
    }
    if (totalPaise < 0L || changePaise < 0L) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          INVALID_AMOUNT,
          "Paid, due, and change cannot be negative.");
    }
    long paid = 0L;
    long due = 0L;
    long cash = 0L;
    for (Part part : parts) {
      if (part == null || part.mode() == null) {
        throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
      }
      if (part.amountPaise() <= 0L) {
        throw new ApiException(
            HttpStatus.UNPROCESSABLE_ENTITY,
            INVALID_AMOUNT,
            "Each tender amount must be greater than zero.");
      }
      paid += part.amountPaise();
      if (part.mode() == PaymentMode.CREDIT) {
        due += part.amountPaise();
      }
      if (part.mode() == PaymentMode.CASH) {
        cash += part.amountPaise();
      }
    }
    long expected = totalPaise + changePaise;
    if (paid < expected) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          UNDER_ALLOCATION,
          "Tender does not cover this bill. Add cash, UPI, card, bank, or khata.");
    }
    if (paid > expected) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          OVER_ALLOCATION,
          "Tender is more than this bill. Reduce a part or record the change.");
    }
    if (changePaise > 0L && cash < changePaise) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          INVALID_CHANGE,
          "Change back is only from cash tendered over the bill.");
    }
    if (changePaise != paid - totalPaise) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          INVALID_CHANGE,
          "Change back is only from cash tendered over the bill.");
    }
    return new Allocation(paid, due, changePaise, List.copyOf(parts));
  }

  public static void requireKhataCustomer(long creditPaise, UUID customerId) {
    if (creditPaise <= 0L) {
      return;
    }
    if (customerId == null) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          KHATA_REQUIRES_CUSTOMER,
          "Link a patient before putting this bill on khata.");
    }
  }

  public static void assertDraft(SalesInvoiceStatus status) {
    if (status != SalesInvoiceStatus.DRAFT) {
      throw new ApiException(
          HttpStatus.CONFLICT, InvoicePolicy.STALE_STATE, "This bill was already collected.");
    }
  }

  public static void assertExpectedTotal(long actual, Long expected) {
    if (expected == null || expected != actual) {
      throw new ApiException(
          HttpStatus.CONFLICT,
          InvoicePolicy.STALE_STATE,
          "This bill total changed. Refresh and collect again.");
    }
  }

  public static String optionalReference(String reference) {
    if (reference == null || reference.isBlank()) {
      return null;
    }
    String trimmed = reference.trim();
    if (trimmed.length() > 64) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
    return trimmed;
  }

  public static PaymentMode requireMode(String mode) {
    if (mode == null || mode.isBlank()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
    try {
      return PaymentMode.valueOf(mode.trim().toUpperCase(Locale.ROOT));
    } catch (RuntimeException ex) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
  }

  public record Part(PaymentMode mode, long amountPaise, String reference) {}

  public record Allocation(
      long amountPaidPaise, long amountDuePaise, long changePaise, List<Part> parts) {}
}
