package com.nammamedmate.server.domain;

import com.nammamedmate.server.shared.exception.ApiException;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Locale;
import java.util.UUID;
import org.springframework.http.HttpStatus;

public final class ControlledSalePolicy {

  public static final String INCOMPLETE_REGISTER = "INCOMPLETE_REGISTER";
  public static final String FORBIDDEN = "FORBIDDEN";
  public static final String NOT_FOUND = "NOT_FOUND";
  public static final String NO_ACTIVE_BRANCH = "NO_ACTIVE_BRANCH";
  public static final String NO_BRANCH_MESSAGE =
      "Select an outlet before opening the NDPS sale book.";

  private ControlledSalePolicy() {}

  public static boolean canView(AppUserRole role, boolean pharmacistAssigned) {
    return role == AppUserRole.pharmacy_owner || pharmacistAssigned;
  }

  public static void requireViewer(AppUserRole role, boolean pharmacistAssigned) {
    if (!canView(role, pharmacistAssigned)) {
      throw new ApiException(
          HttpStatus.FORBIDDEN,
          FORBIDDEN,
          "Only a pharmacist or owner can open the NDPS sale book.");
    }
  }

  public static void requireSaleFact(
      String productName,
      BigDecimal quantity,
      String batchNumber,
      String prescriptionReference,
      String patientName,
      String pharmacistName,
      Instant occurredAt) {
    if (blank(productName)
        || !positive(quantity)
        || blank(batchNumber)
        || blank(prescriptionReference)
        || blank(patientName)
        || blank(pharmacistName)
        || occurredAt == null) {
      throw incomplete();
    }
  }

  public static void requireReturnFact(
      UUID sourceRegisterId, BigDecimal quantity, Instant occurredAt) {
    if (sourceRegisterId == null || !positive(quantity) || occurredAt == null) {
      throw incomplete();
    }
  }

  public static ScheduleClassification parseSchedule(String schedule) {
    if (schedule == null || schedule.isBlank()) {
      return null;
    }
    try {
      return ScheduleClassification.valueOf(schedule.trim().toUpperCase(Locale.ROOT));
    } catch (IllegalArgumentException ex) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
  }

  public static ApiException incomplete() {
    return new ApiException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        INCOMPLETE_REGISTER,
        "This Schedule sale is missing product, batch, Rx, patient, or pharmacist details.");
  }

  public static ApiException forbidden() {
    return new ApiException(HttpStatus.FORBIDDEN, FORBIDDEN, "Access denied");
  }

  public static ApiException notFound() {
    return new ApiException(HttpStatus.NOT_FOUND, NOT_FOUND, "Record was not found");
  }

  public static ApiException noBranch() {
    return new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, NO_ACTIVE_BRANCH, NO_BRANCH_MESSAGE);
  }

  private static boolean blank(String value) {
    return value == null || value.isBlank();
  }

  private static boolean positive(BigDecimal quantity) {
    return quantity != null && quantity.compareTo(BigDecimal.ZERO) > 0;
  }
}
