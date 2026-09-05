package com.nammamedmate.server.domain;

import com.nammamedmate.server.shared.exception.ApiException;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.springframework.http.HttpStatus;

public final class GoodsReceiptPolicy {

  public static final String PRICE_MISMATCH = "PRICE_MISMATCH";
  public static final String OVER_RECEIPT = "OVER_RECEIPT";
  public static final String PO_NOT_ISSUED = "PO_NOT_ISSUED";
  public static final String INVALID_QUANTITY = PurchaseOrderPolicy.INVALID_QUANTITY;
  public static final String DUPLICATE_RECEIPT = "DUPLICATE_RECEIPT";
  public static final String LINES_REQUIRED = PurchaseOrderPolicy.LINES_REQUIRED;

  private GoodsReceiptPolicy() {}

  public static void assertIssued(PurchaseOrderStatus status) {
    if (status == PurchaseOrderStatus.ISSUED) {
      return;
    }
    if (status == PurchaseOrderStatus.DRAFT) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          PO_NOT_ISSUED,
          "Record delivery only after the indent is issued to the stockist.");
    }
    throw new ApiException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        PurchaseOrderPolicy.PO_CLOSED,
        "Closed or cancelled indents cannot take a delivery.");
  }

  public static BigDecimal assertQuantity(BigDecimal quantity) {
    if (quantity == null || quantity.compareTo(BigDecimal.ZERO) <= 0) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY, INVALID_QUANTITY, "Quantity must be greater than zero.");
    }
    return quantity.stripTrailingZeros();
  }

  public static void assertPriceMatch(long poUnitRatePaise, long receivedUnitRatePaise) {
    if (poUnitRatePaise != receivedUnitRatePaise) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          PRICE_MISMATCH,
          "Delivery rate must match the indent rate.");
    }
  }

  public static void assertNotOverReceipt(BigDecimal received, BigDecimal outstanding) {
    if (received.compareTo(outstanding) > 0) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          OVER_RECEIPT,
          "Received quantity exceeds outstanding on this indent.");
    }
  }

  public static String requireReference(String receiptReference) {
    if (receiptReference == null || receiptReference.isBlank()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
    return receiptReference.trim();
  }

  public static String financialYear(LocalDate istDate) {
    return PurchaseOrderPolicy.financialYear(istDate);
  }

  public static String receiptNumber(String financialYear, String branchCode, int sequence) {
    return "GRN/" + financialYear + "/" + branchCode + "/" + String.format("%05d", sequence);
  }
}
