package com.nammamedmate.server.domain;

import com.nammamedmate.server.shared.exception.ApiException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;

public final class PurchaseOrderPolicy {

  public static final String MIXED_SUPPLIER = "MIXED_SUPPLIER";
  public static final String SUPPLIER_INACTIVE = "SUPPLIER_INACTIVE";
  public static final String PRODUCT_INACTIVE = "PRODUCT_INACTIVE";
  public static final String INVALID_QUANTITY = "INVALID_QUANTITY";
  public static final String PO_CLOSED = "PO_CLOSED";
  public static final String STALE_STATE = "STALE_STATE";
  public static final String LINES_REQUIRED = "LINES_REQUIRED";

  private PurchaseOrderPolicy() {}

  public static UUID requireSupplierId(UUID supplierId) {
    if (supplierId == null) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
    return supplierId;
  }

  public static void assertSameSupplier(UUID existing, UUID incoming) {
    if (incoming == null || existing.equals(incoming)) {
      return;
    }
    throw new ApiException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        MIXED_SUPPLIER,
        "A purchase order can reference only one supplier.");
  }

  public static void assertSupplierActive(SupplierStatus status) {
    if (status != SupplierStatus.ACTIVE) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          SUPPLIER_INACTIVE,
          "Inactive suppliers cannot take a purchase order.");
    }
  }

  public static void assertProductActive(boolean active, boolean discontinued) {
    if (!active || discontinued) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          PRODUCT_INACTIVE,
          "Inactive products cannot be ordered.");
    }
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

  public static long requireUnitRatePaise(Long unitRatePaise) {
    if (unitRatePaise == null || unitRatePaise <= 0) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          INVALID_QUANTITY,
          "Agreed rate must be greater than zero.");
    }
    return unitRatePaise;
  }

  public static void assertEditable(PurchaseOrderStatus status) {
    if (status == PurchaseOrderStatus.CLOSED || status == PurchaseOrderStatus.CANCELLED) {
      throw closed();
    }
  }

  public static void assertTransition(PurchaseOrderStatus from, PurchaseOrderStatus to) {
    boolean allowed =
        (from == PurchaseOrderStatus.DRAFT && to == PurchaseOrderStatus.ISSUED)
            || (from == PurchaseOrderStatus.ISSUED && to == PurchaseOrderStatus.CLOSED)
            || (from == PurchaseOrderStatus.DRAFT && to == PurchaseOrderStatus.CANCELLED)
            || (from == PurchaseOrderStatus.ISSUED && to == PurchaseOrderStatus.CANCELLED);
    if (!allowed) {
      throw closed();
    }
  }

  public static void assertVersion(int current, Integer expected) {
    if (expected == null || expected != current) {
      throw new ApiException(
          HttpStatus.CONFLICT, STALE_STATE, "Purchase order was updated by someone else.");
    }
  }

  public static void requireLines(List<?> lines) {
    if (lines == null || lines.isEmpty()) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY, LINES_REQUIRED, "Add at least one medicine line.");
    }
  }

  public static LineMoney lineMoney(
      BigDecimal quantity, long unitRatePaise, BigDecimal gstRate, boolean taxable) {
    long subtotal =
        quantity
            .multiply(BigDecimal.valueOf(unitRatePaise))
            .setScale(0, RoundingMode.HALF_UP)
            .longValueExact();
    long tax = 0L;
    if (taxable && gstRate != null && gstRate.compareTo(BigDecimal.ZERO) > 0) {
      tax =
          BigDecimal.valueOf(subtotal)
              .multiply(gstRate)
              .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP)
              .longValueExact();
    }
    return new LineMoney(subtotal, tax, subtotal + tax);
  }

  public static OrderMoney orderMoney(List<LineMoney> lines) {
    long subtotal = 0L;
    long tax = 0L;
    for (LineMoney line : lines) {
      subtotal += line.subtotalPaise();
      tax += line.taxPaise();
    }
    return new OrderMoney(subtotal, tax, subtotal + tax);
  }

  public static String financialYear(LocalDate istDate) {
    int year = istDate.getYear();
    if (istDate.getMonthValue() >= 4) {
      return year + "-" + String.format("%02d", (year + 1) % 100);
    }
    return (year - 1) + "-" + String.format("%02d", year % 100);
  }

  public static String poNumber(String financialYear, String branchCode, int sequence) {
    return "PO/" + financialYear + "/" + branchCode + "/" + String.format("%05d", sequence);
  }

  private static ApiException closed() {
    return new ApiException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        PO_CLOSED,
        "Closed or cancelled quantities cannot be edited.");
  }

  public record LineMoney(long subtotalPaise, long taxPaise, long totalPaise) {}

  public record OrderMoney(long subtotalPaise, long taxPaise, long totalPaise) {}
}
