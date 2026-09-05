package com.nammamedmate.server.domain;

import com.nammamedmate.server.shared.exception.ApiException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;

public final class InvoicePolicy {

  public static final String STALE_STOCK = "STALE_STOCK";
  public static final String NUMBER_COLLISION = "NUMBER_COLLISION";
  public static final String INVALID_UOM = "INVALID_UOM";
  public static final String FOREIGN_BATCH = "FOREIGN_BATCH";
  public static final String INCOMPLETE_CONTROLLED = "INCOMPLETE_CONTROLLED";
  public static final String STALE_STATE = "STALE_STATE";
  public static final String LINES_REQUIRED = "LINES_REQUIRED";
  public static final String INVALID_QUANTITY = "INVALID_QUANTITY";
  public static final String PRICE_INVALID = "PRICE_INVALID";

  private InvoicePolicy() {}

  public static String financialYear(LocalDate istDate) {
    return PurchaseOrderPolicy.financialYear(istDate);
  }

  public static String invoiceNumber(String financialYear, String branchCode, int sequence) {
    return "INV/" + financialYear + "/" + branchCode + "/" + String.format("%05d", sequence);
  }

  public static BigDecimal requireQuantity(BigDecimal quantity, int precision) {
    if (quantity == null || quantity.compareTo(BigDecimal.ZERO) <= 0) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY, INVALID_QUANTITY, "Quantity must be greater than zero.");
    }
    BigDecimal normalized = quantity.stripTrailingZeros();
    int scale = Math.max(normalized.scale(), 0);
    if (scale > precision) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY, INVALID_QUANTITY, "Quantity exceeds allowed precision.");
    }
    return normalized;
  }

  public static void requirePrices(long mrpPaise, long sellingPricePaise, long discountPaise) {
    if (mrpPaise <= 0 || sellingPricePaise <= 0 || sellingPricePaise > mrpPaise) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          PRICE_INVALID,
          "Selling price must be greater than zero and not above MRP.");
    }
    if (discountPaise < 0) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY, PRICE_INVALID, "Discount cannot be negative.");
    }
  }

  public static void requireLines(List<?> lines) {
    if (lines == null || lines.isEmpty()) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY, LINES_REQUIRED, "Add at least one medicine line.");
    }
  }

  public static void assertVersion(int current, Integer expected) {
    if (expected == null || expected != current) {
      throw new ApiException(
          HttpStatus.CONFLICT, STALE_STATE, "This bill was updated on another till.");
    }
  }

  public static void assertStockAvailable(BigDecimal available, BigDecimal required) {
    if (available == null || available.compareTo(required) < 0) {
      throw new ApiException(
          HttpStatus.CONFLICT, STALE_STOCK, "Floor qty changed. Refresh the batch and try again.");
    }
  }

  public static void assertBatchOnProduct(UUID batchProductId, UUID lineProductId) {
    if (batchProductId == null || !batchProductId.equals(lineProductId)) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          FOREIGN_BATCH,
          "That batch does not belong to this medicine.");
    }
  }

  public static void requireControlledContext(
      boolean controlled, UUID customerId, UUID doctorId, boolean prescriptionVerified) {
    if (!controlled) {
      return;
    }
    ControlledStockPolicy.requirePrescriptionVerified(customerId, doctorId, prescriptionVerified);
  }

  public static LineMoney lineMoney(
      BigDecimal quantity, long sellingPricePaise, long discountPaise, BigDecimal gstRate) {
    long gross =
        quantity
            .multiply(BigDecimal.valueOf(sellingPricePaise))
            .setScale(0, RoundingMode.HALF_UP)
            .longValueExact();
    if (discountPaise > gross) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          PRICE_INVALID,
          "Discount cannot exceed the line selling amount.");
    }
    long taxable = gross - discountPaise;
    long tax = 0L;
    if (gstRate != null && gstRate.compareTo(BigDecimal.ZERO) > 0) {
      tax =
          BigDecimal.valueOf(taxable)
              .multiply(gstRate)
              .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP)
              .longValueExact();
    }
    long cgst = tax / 2;
    long sgst = tax - cgst;
    return new LineMoney(taxable, tax, cgst, sgst, 0L, taxable + tax, discountPaise);
  }

  public static HeaderMoney headerMoney(List<LineMoney> lines) {
    long taxable = 0L;
    long tax = 0L;
    long discount = 0L;
    for (LineMoney line : lines) {
      taxable += line.taxablePaise();
      tax += line.taxPaise();
      discount += line.discountPaise();
    }
    return new HeaderMoney(taxable, discount, tax, taxable + tax);
  }

  public record LineMoney(
      long taxablePaise,
      long taxPaise,
      long cgstPaise,
      long sgstPaise,
      long igstPaise,
      long totalPaise,
      long discountPaise) {}

  public record HeaderMoney(
      long subtotalPaise, long discountPaise, long taxPaise, long totalPaise) {}
}
