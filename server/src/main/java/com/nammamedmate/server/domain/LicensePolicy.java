package com.nammamedmate.server.domain;

import com.nammamedmate.server.shared.exception.ApiException;
import java.time.LocalDate;
import java.util.Locale;
import java.util.UUID;
import org.springframework.http.HttpStatus;

public final class LicensePolicy {

  public static final int ALERT_DAYS = 30;
  public static final String LICENSE_DATE_INVALID = "LICENSE_DATE_INVALID";
  public static final String MISSING_EVIDENCE = "MISSING_EVIDENCE";
  public static final String INVALID_LICENSE = "INVALID_LICENSE";
  public static final String CONFLICT = "CONFLICT";
  public static final String STALE_STATE = "STALE_STATE";
  public static final String FORBIDDEN = "FORBIDDEN";
  public static final String NOT_FOUND = "NOT_FOUND";
  public static final String UNSUPPORTED_FILE = "UNSUPPORTED_FILE";

  private LicensePolicy() {}

  public static ComplianceDocType requireType(String docType) {
    if (docType == null || docType.isBlank()) {
      throw shape();
    }
    try {
      return ComplianceDocType.valueOf(docType.trim().toUpperCase(Locale.ROOT));
    } catch (IllegalArgumentException ex) {
      throw shape();
    }
  }

  public static ComplianceLicenseScope requireScope(
      ComplianceDocType type, String scope, UUID branchId, UUID staffUserId) {
    if (scope == null || scope.isBlank()) {
      throw shape();
    }
    ComplianceLicenseScope parsed;
    try {
      parsed = ComplianceLicenseScope.valueOf(scope.trim().toUpperCase(Locale.ROOT));
    } catch (IllegalArgumentException ex) {
      throw shape();
    }
    return switch (type) {
      case DRUG_LICENSE, GST, FSSAI -> pharmacyScope(parsed, branchId, staffUserId);
      case PHARMACIST_REGISTRATION -> staffScope(parsed, branchId, staffUserId);
    };
  }

  public static String requireNumber(ComplianceDocType type, String licenseNumber) {
    String cleaned = licenseNumber == null ? "" : licenseNumber.trim();
    if (type == ComplianceDocType.PHARMACIST_REGISTRATION) {
      if (!StaffLicenseRules.valid(StaffRegistrationKind.PHARMACIST, cleaned)) {
        throw new ApiException(
            HttpStatus.UNPROCESSABLE_ENTITY,
            INVALID_LICENSE,
            "Pharmacist registration number is required.");
      }
      return StaffLicenseRules.normalized(cleaned);
    }
    if (cleaned.isEmpty()) {
      throw shape();
    }
    return cleaned;
  }

  public static LocalDate[] requireDates(LocalDate issuedOn, LocalDate expiresOn) {
    if (issuedOn == null || expiresOn == null) {
      throw dateInvalid();
    }
    if (expiresOn.isBefore(issuedOn)) {
      throw dateInvalid();
    }
    return new LocalDate[] {issuedOn, expiresOn};
  }

  public static LocalDate dueCutoff(LocalDate today) {
    return today.plusDays(ALERT_DAYS);
  }

  public static boolean isDue(LocalDate expiresOn, LocalDate today) {
    return expiresOn != null && !expiresOn.isAfter(dueCutoff(today));
  }

  public static void requireEvidencePresent(boolean present) {
    if (!present) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY, MISSING_EVIDENCE, "Licence evidence file is required.");
    }
  }

  public static void requireVersion(int current, Integer expected) {
    if (expected == null || expected != current) {
      throw new ApiException(
          HttpStatus.CONFLICT, STALE_STATE, "This licence was updated. Reload and try again.");
    }
  }

  public static ApiException conflict() {
    return new ApiException(
        HttpStatus.CONFLICT, CONFLICT, "This licence type is already tracked for that scope.");
  }

  public static ApiException notFound() {
    return new ApiException(HttpStatus.NOT_FOUND, NOT_FOUND, "Licence not found.");
  }

  public static ApiException forbidden() {
    return new ApiException(HttpStatus.FORBIDDEN, FORBIDDEN, "Forbidden");
  }

  public static ApiException unsupportedFile() {
    return new ApiException(
        HttpStatus.UNPROCESSABLE_ENTITY, UNSUPPORTED_FILE, "Upload a PDF, JPEG, or PNG file.");
  }

  private static ComplianceLicenseScope pharmacyScope(
      ComplianceLicenseScope scope, UUID branchId, UUID staffUserId) {
    if (staffUserId != null) {
      throw shape();
    }
    if (scope == ComplianceLicenseScope.TENANT) {
      if (branchId != null) {
        throw shape();
      }
      return scope;
    }
    if (scope == ComplianceLicenseScope.BRANCH) {
      if (branchId == null) {
        throw shape();
      }
      return scope;
    }
    throw shape();
  }

  private static ComplianceLicenseScope staffScope(
      ComplianceLicenseScope scope, UUID branchId, UUID staffUserId) {
    if (scope != ComplianceLicenseScope.STAFF || staffUserId == null || branchId != null) {
      throw shape();
    }
    return scope;
  }

  private static ApiException dateInvalid() {
    return new ApiException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        LICENSE_DATE_INVALID,
        "Issue date must be on or before expiry.");
  }

  private static ApiException shape() {
    return new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
  }
}
