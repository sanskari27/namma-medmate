package com.nammamedmate.server.domain;

import com.nammamedmate.server.shared.exception.ApiException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import org.springframework.http.HttpStatus;

public final class HospitalPolicy {

  public static final String PLAN_LIMIT = "PLAN_LIMIT";
  public static final String PLAN_LIMIT_MESSAGE =
      "Hospital billing is on the Pro plan. Upgrade this pharmacy to open hospital billing.";
  public static final String ACCOUNT_REQUIRED = "ACCOUNT_REQUIRED";
  public static final String DISCOUNT_OVER_MRP = "DISCOUNT_OVER_MRP";
  public static final String APPROVAL_REQUIRED = "APPROVAL_REQUIRED";
  public static final String BED_OCCUPIED = "BED_OCCUPIED";
  public static final String BED_OCCUPIED_MESSAGE = "That bed is already occupied.";
  public static final String PHARMACIST_CODE = "pharmacist";

  private HospitalPolicy() {}

  public static boolean entitled(PlanCode plan) {
    return PlanModuleEntitlements.entitledForTenant(plan, ModuleCode.HOSPITAL);
  }

  public static void assertEntitled(PlanCode plan) {
    if (!entitled(plan)) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, PLAN_LIMIT, PLAN_LIMIT_MESSAGE);
    }
  }

  public static void requireHospitalModule(boolean hasHospital) {
    if (!hasHospital) {
      throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Forbidden");
    }
  }

  public static void requireAccountWriter(
      AppUserRole role, boolean accountantDesk, boolean hasHospital) {
    requireHospitalModule(hasHospital);
    if (role == AppUserRole.pharmacy_owner) {
      return;
    }
    if (role == AppUserRole.pharmacy_staff && accountantDesk) {
      return;
    }
    throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Forbidden");
  }

  public static void requireOwner(AppUserRole role) {
    if (role != AppUserRole.pharmacy_owner) {
      throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Forbidden");
    }
  }

  public static void requireWardWriter(
      AppUserRole role, boolean pharmacistAssigned, boolean hasHospital) {
    requireHospitalModule(hasHospital);
    if (role == AppUserRole.pharmacy_owner) {
      return;
    }
    if (role == AppUserRole.pharmacy_staff && pharmacistAssigned) {
      return;
    }
    throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Forbidden");
  }

  public static void requirePositiveCapacity(int capacity) {
    if (capacity <= 0) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY, "VALIDATION_ERROR", "Bed capacity must be at least 1.");
    }
  }

  public static HospitalDepartmentType parseDepartmentType(String raw) {
    if (raw == null || raw.isBlank()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
    try {
      return HospitalDepartmentType.valueOf(raw.trim().toUpperCase());
    } catch (RuntimeException ex) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
  }

  public static HospitalDoctorStatus parseDoctorStatus(String raw) {
    if (raw == null || raw.isBlank()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
    try {
      return HospitalDoctorStatus.valueOf(raw.trim().toUpperCase());
    } catch (RuntimeException ex) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
  }

  public static HospitalWardCategory parseCategory(String raw) {
    if (raw == null || raw.isBlank()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
    try {
      return HospitalWardCategory.valueOf(raw.trim().toUpperCase());
    } catch (RuntimeException ex) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
  }

  public static ApiException bedOccupied() {
    return new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, BED_OCCUPIED, BED_OCCUPIED_MESSAGE);
  }

  public static void requireNonNegativeLimit(long limitPaise) {
    if (limitPaise < 0L) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY, "VALIDATION_ERROR", "Credit limit cannot be negative.");
    }
  }

  public static void requireUniformBps(int bps) {
    if (bps < 0 || bps > 10_000) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY, "VALIDATION_ERROR", "Invalid uniform discount.");
    }
  }

  public static long creditPricePaise(
      long mrpPaise, int uniformDiscountBps, HospitalPriceRuleType ruleType, Integer ruleValue) {
    if (mrpPaise <= 0L) {
      return 0L;
    }
    long discount = discountPaise(mrpPaise, uniformDiscountBps, ruleType, ruleValue);
    if (discount > mrpPaise) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          DISCOUNT_OVER_MRP,
          "Hospital discount cannot exceed MRP.");
    }
    return mrpPaise - discount;
  }

  public static long discountPaise(
      long mrpPaise, int uniformDiscountBps, HospitalPriceRuleType ruleType, Integer ruleValue) {
    if (mrpPaise <= 0L) {
      return 0L;
    }
    if (ruleType == HospitalPriceRuleType.FLAT_PAISE && ruleValue != null) {
      return Math.min(ruleValue.longValue(), mrpPaise);
    }
    if (ruleType == HospitalPriceRuleType.PERCENT && ruleValue != null) {
      return percentOff(mrpPaise, ruleValue);
    }
    return percentOff(mrpPaise, uniformDiscountBps);
  }

  public static int effectiveDiscountBps(long mrpPaise, long creditPricePaise) {
    if (mrpPaise <= 0L) {
      return 0;
    }
    long discount = mrpPaise - creditPricePaise;
    if (discount <= 0L) {
      return 0;
    }
    return BigDecimal.valueOf(discount)
        .multiply(BigDecimal.valueOf(10_000))
        .divide(BigDecimal.valueOf(mrpPaise), 0, RoundingMode.HALF_UP)
        .intValueExact();
  }

  private static long percentOff(long mrpPaise, int bps) {
    if (bps <= 0) {
      return 0L;
    }
    return BigDecimal.valueOf(mrpPaise)
        .multiply(BigDecimal.valueOf(bps))
        .divide(BigDecimal.valueOf(10_000), 0, RoundingMode.HALF_UP)
        .longValueExact();
  }

  public static HospitalCreditTerms parseTerms(String raw) {
    if (raw == null || raw.isBlank()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
    try {
      return HospitalCreditTerms.valueOf(raw.trim().toUpperCase());
    } catch (RuntimeException ex) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
  }

  public static HospitalPriceRuleType parseRuleType(String raw) {
    if (raw == null || raw.isBlank()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
    try {
      return HospitalPriceRuleType.valueOf(raw.trim().toUpperCase());
    } catch (RuntimeException ex) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
  }

  public static ApiException notFound() {
    return new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Not found");
  }
}
