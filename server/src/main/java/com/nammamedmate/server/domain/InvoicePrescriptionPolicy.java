package com.nammamedmate.server.domain;

import com.nammamedmate.server.shared.exception.ApiException;
import java.math.BigDecimal;
import java.util.UUID;
import org.springframework.http.HttpStatus;

public final class InvoicePrescriptionPolicy {

  public static final String RX_REQUIRED = "RX_REQUIRED";
  public static final String OVER_FULFILLMENT = "OVER_FULFILLMENT";
  public static final String FOREIGN_REFERENCE = "FOREIGN_REFERENCE";
  public static final String PRESCRIBED_REQUIRED = "PRESCRIBED_REQUIRED";

  private InvoicePrescriptionPolicy() {}

  public static boolean needsRx(Product product) {
    if (product == null) {
      return false;
    }
    return product.isPrescriptionRequired() || ControlledStockPolicy.isControlled(product);
  }

  public static String requireReference(boolean needsRx, boolean verified, String reference) {
    if (!needsRx) {
      return blankToNull(reference);
    }
    String normalized = blankToNull(reference);
    if (!verified || normalized == null) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          RX_REQUIRED,
          "Tick Prescription checked and enter the Rx reference.");
    }
    return normalized;
  }

  public static void requirePatient(boolean needsRx, UUID customerId) {
    if (!needsRx || customerId != null) {
      return;
    }
    throw new ApiException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        RX_REQUIRED,
        "Link the patient before billing a prescription medicine.");
  }

  public static BigDecimal requirePrescribed(boolean needsRx, BigDecimal prescribed) {
    if (!needsRx) {
      return null;
    }
    if (prescribed == null || prescribed.compareTo(BigDecimal.ZERO) <= 0) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          PRESCRIBED_REQUIRED,
          "Enter how many this Rx allows for this medicine.");
    }
    return prescribed.stripTrailingZeros();
  }

  public static void assertCustomerBind(UUID boundCustomerId, UUID requestCustomerId) {
    if (boundCustomerId == null) {
      return;
    }
    if (requestCustomerId == null || !boundCustomerId.equals(requestCustomerId)) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          FOREIGN_REFERENCE,
          "That Rx reference is already on another patient.");
    }
  }

  public static BigDecimal remaining(BigDecimal prescribed, BigDecimal fulfilled) {
    BigDecimal allowed = prescribed == null ? BigDecimal.ZERO : prescribed;
    BigDecimal used = fulfilled == null ? BigDecimal.ZERO : fulfilled;
    return allowed.subtract(used);
  }

  public static void assertCanFill(
      BigDecimal prescribed, BigDecimal fulfilled, BigDecimal thisQuantity) {
    BigDecimal next = remaining(prescribed, fulfilled).subtract(thisQuantity);
    if (thisQuantity == null
        || thisQuantity.compareTo(BigDecimal.ZERO) <= 0
        || next.compareTo(BigDecimal.ZERO) < 0) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          OVER_FULFILLMENT,
          "This visit would exceed what remains on that Rx.");
    }
  }

  private static String blankToNull(String value) {
    if (value == null || value.isBlank()) {
      return null;
    }
    return value.trim();
  }
}
