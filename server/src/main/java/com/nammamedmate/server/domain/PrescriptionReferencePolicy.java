package com.nammamedmate.server.domain;

import com.nammamedmate.server.shared.exception.ApiException;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Locale;
import org.springframework.http.HttpStatus;

public final class PrescriptionReferencePolicy {

  public static final int VALIDITY_MONTHS = 6;
  public static final String PREMATURE_ARCHIVE = "PREMATURE_ARCHIVE";
  public static final String ARCHIVED_REFERENCE = "ARCHIVED_REFERENCE";
  public static final String REACTIVATION_FORBIDDEN = "REACTIVATION_FORBIDDEN";
  public static final String STALE_STATE = "STALE_STATE";
  public static final String FORBIDDEN = "FORBIDDEN";
  public static final String NOT_FOUND = "NOT_FOUND";
  public static final String VALIDATION_ERROR = "VALIDATION_ERROR";

  private PrescriptionReferencePolicy() {}

  public static Instant expiresAt(Instant issuedAt) {
    if (issuedAt == null) {
      throw new ApiException(HttpStatus.BAD_REQUEST, VALIDATION_ERROR, "Invalid request");
    }
    return issuedAt.atOffset(ZoneOffset.UTC).plusMonths(VALIDITY_MONTHS).toInstant();
  }

  public static boolean expired(Instant now, Instant expiresAt) {
    if (now == null || expiresAt == null) {
      return false;
    }
    return !now.isBefore(expiresAt);
  }

  public static boolean fullyFulfilled(boolean hasFills, BigDecimal remaining) {
    if (!hasFills) {
      return false;
    }
    BigDecimal leftover = remaining == null ? BigDecimal.ZERO : remaining;
    return leftover.compareTo(BigDecimal.ZERO) <= 0;
  }

  public static boolean eligibleToArchive(
      Instant now, Instant expiresAt, boolean hasFills, BigDecimal remaining) {
    return fullyFulfilled(hasFills, remaining) || expired(now, expiresAt);
  }

  public static PrescriptionReferenceArchiveReason archiveReason(
      Instant now, Instant expiresAt, boolean hasFills, BigDecimal remaining) {
    if (fullyFulfilled(hasFills, remaining)) {
      return PrescriptionReferenceArchiveReason.FULFILLED;
    }
    if (expired(now, expiresAt)) {
      return PrescriptionReferenceArchiveReason.EXPIRED;
    }
    throw premature();
  }

  public static void requireEligible(
      Instant now, Instant expiresAt, boolean hasFills, BigDecimal remaining) {
    archiveReason(now, expiresAt, hasFills, remaining);
  }

  public static void assertSelectable(PrescriptionReferenceStatus status) {
    if (status == PrescriptionReferenceStatus.ARCHIVED) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          ARCHIVED_REFERENCE,
          "This Rx is archived. Open history, not a new sale.");
    }
  }

  public static void assertCannotReactivate() {
    throw new ApiException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        REACTIVATION_FORBIDDEN,
        "Archived Rx references cannot be reactivated.");
  }

  public static void assertVersion(int current, Integer expected) {
    if (expected != null && expected != current) {
      throw new ApiException(
          HttpStatus.CONFLICT, STALE_STATE, "This Rx file changed on another till. Reload it.");
    }
  }

  public static PrescriptionReferenceStatus parseStatus(String raw) {
    if (raw == null || raw.isBlank()) {
      return null;
    }
    try {
      return PrescriptionReferenceStatus.valueOf(raw.trim().toUpperCase(Locale.ROOT));
    } catch (IllegalArgumentException ex) {
      throw new ApiException(HttpStatus.BAD_REQUEST, VALIDATION_ERROR, "Invalid request");
    }
  }

  public static ApiException notFound() {
    return new ApiException(HttpStatus.NOT_FOUND, NOT_FOUND, "That Rx reference was not found");
  }

  public static ApiException forbidden() {
    return new ApiException(
        HttpStatus.FORBIDDEN, FORBIDDEN, "Only a pharmacist or owner can open the Rx file.");
  }

  private static ApiException premature() {
    return new ApiException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        PREMATURE_ARCHIVE,
        "This Rx is still valid and still has quantity left. Wait until it is filled or six months have passed.");
  }
}
