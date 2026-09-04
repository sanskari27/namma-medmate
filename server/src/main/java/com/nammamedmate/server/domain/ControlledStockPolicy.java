package com.nammamedmate.server.domain;

import com.nammamedmate.server.shared.exception.ApiException;
import java.util.UUID;
import org.springframework.http.HttpStatus;

public final class ControlledStockPolicy {

  private ControlledStockPolicy() {}

  public static boolean isControlled(Product product) {
    if (product == null) {
      return false;
    }
    return isControlled(product.getScheduleClassification(), product.isControlledSubstance());
  }

  public static boolean isControlled(ScheduleClassification schedule, boolean controlledSubstance) {
    if (controlledSubstance) {
      return true;
    }
    return schedule == ScheduleClassification.H
        || schedule == ScheduleClassification.H1
        || schedule == ScheduleClassification.X
        || schedule == ScheduleClassification.NDPS;
  }

  public static boolean canDispense(AppUserRole role, boolean pharmacistAssigned) {
    return role == AppUserRole.pharmacy_owner || pharmacistAssigned;
  }

  public static void requireDispenseAuthority(AppUserRole role, boolean pharmacistAssigned) {
    if (!canDispense(role, pharmacistAssigned)) {
      throw new ApiException(
          HttpStatus.FORBIDDEN,
          "PHARMACIST_REQUIRED",
          "Only a pharmacist or owner can dispense Schedule H, H1, X, or NDPS stock.");
    }
  }

  public static void requirePrescriptionVerified(
      UUID customerId, UUID doctorId, boolean prescriptionVerified) {
    if (customerId == null || doctorId == null || !prescriptionVerified) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          "INCOMPLETE_CONTROLLED",
          "Link the patient and prescriber, then tick that the prescription was checked.");
    }
  }

  public static boolean isInbound(StockMovementType type) {
    return type == StockMovementType.STOCK_IN
        || type == StockMovementType.TRANSFER_IN
        || type == StockMovementType.ADJUSTMENT_IN;
  }
}
