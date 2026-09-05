package com.nammamedmate.server.domain;

import com.nammamedmate.server.shared.exception.ApiException;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.springframework.http.HttpStatus;

public final class QualityCheckPolicy {

  public static final String PHARMACIST_REQUIRED = "PHARMACIST_REQUIRED";
  public static final String QUANTITY_MISMATCH = "QUANTITY_MISMATCH";
  public static final String CHECKLIST_INCOMPLETE = "CHECKLIST_INCOMPLETE";
  public static final String INVALID_EXPIRY = "INVALID_EXPIRY";
  public static final String STALE_STATE = "STALE_STATE";
  public static final String IDEMPOTENCY_CONFLICT = "IDEMPOTENCY_CONFLICT";

  private QualityCheckPolicy() {}

  public static void requirePharmacist(AppUserRole role, boolean pharmacistAssigned) {
    if (role == AppUserRole.pharmacy_owner || pharmacistAssigned) {
      return;
    }
    throw new ApiException(
        HttpStatus.FORBIDDEN,
        PHARMACIST_REQUIRED,
        "Only a pharmacist or owner can accept a delivery onto the floor.");
  }

  public static void assertPending(GoodsReceiptStatus status) {
    if (status == GoodsReceiptStatus.PENDING_QC) {
      return;
    }
    throw new ApiException(HttpStatus.CONFLICT, STALE_STATE, "This delivery was already checked.");
  }

  public static void assertQuantities(
      BigDecimal received, BigDecimal accepted, BigDecimal rejected) {
    if (received == null
        || accepted == null
        || rejected == null
        || accepted.signum() < 0
        || rejected.signum() < 0
        || accepted.compareTo(received) > 0
        || accepted.add(rejected).compareTo(received) != 0) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          QUANTITY_MISMATCH,
          "Accepted and rejected quantities must add up to the received quantity.");
    }
  }

  public static void assertChecklistWhenAccepting(
      boolean accepting,
      boolean visualInspectionPassed,
      boolean packagingIntact,
      boolean labelMatches,
      boolean batchReadable,
      boolean noDamage) {
    if (!accepting) {
      return;
    }
    if (visualInspectionPassed && packagingIntact && labelMatches && batchReadable && noDamage) {
      return;
    }
    throw new ApiException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        CHECKLIST_INCOMPLETE,
        "Visual inspection and the full checklist must pass before any quantity is accepted.");
  }

  public static void assertExpiry(
      boolean accepting, boolean requiresBatch, LocalDate expiresOn, LocalDate todayUtc) {
    if (!accepting) {
      return;
    }
    if (requiresBatch && expiresOn == null) {
      throw invalidExpiry();
    }
    if (expiresOn != null && expiresOn.isBefore(todayUtc)) {
      throw invalidExpiry();
    }
  }

  private static ApiException invalidExpiry() {
    return new ApiException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        INVALID_EXPIRY,
        "Accepted packs need a batch expiry that is not in the past.");
  }
}
