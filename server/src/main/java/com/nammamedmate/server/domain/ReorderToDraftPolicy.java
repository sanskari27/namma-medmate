package com.nammamedmate.server.domain;

import com.nammamedmate.server.shared.exception.ApiException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.http.HttpStatus;

public final class ReorderToDraftPolicy {

  public static final String PLAN_LIMIT = "PLAN_LIMIT";
  public static final String STALE_STATE = "STALE_STATE";
  public static final String REORDER_EMPTY = "REORDER_EMPTY";
  public static final String UNMAPPED = "UNMAPPED";
  public static final String AMBIGUOUS = "AMBIGUOUS";
  public static final String NO_RATE = "NO_RATE";
  public static final String PRODUCT_INACTIVE = "PRODUCT_INACTIVE";
  public static final String SUPPLIER_INACTIVE = "SUPPLIER_INACTIVE";
  public static final String ZERO_QTY = "ZERO_QTY";
  public static final String BULK_ISSUE = "ISSUE";
  public static final String BULK_CANCEL = "CANCEL";

  private static final String GROWTH_MESSAGE =
      "Growth or Pro is required to draft purchase orders from the reorder list.";
  private static final String PRO_MESSAGE = "Bulk indent actions and stockist spend are on Pro.";

  private ReorderToDraftPolicy() {}

  public static void assertReorderDraftEntitled(PlanCode plan) {
    if (plan != PlanCode.GROWTH && plan != PlanCode.PRO) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, PLAN_LIMIT, GROWTH_MESSAGE);
    }
  }

  public static void assertProPoTools(PlanCode plan) {
    if (plan != PlanCode.PRO) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, PLAN_LIMIT, PRO_MESSAGE);
    }
  }

  public static String requireIdempotencyKey(String key) {
    if (key == null || key.isBlank() || key.length() > 128) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
    return key.trim();
  }

  public static String requireFingerprint(String fingerprint) {
    if (fingerprint == null || fingerprint.isBlank() || fingerprint.length() > 64) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
    return fingerprint.trim().toLowerCase(Locale.ROOT);
  }

  public static void assertFingerprint(String expected, String actual) {
    if (!expected.equals(actual)) {
      throw new ApiException(
          HttpStatus.CONFLICT, STALE_STATE, "Reorder list changed. Preview again before drafting.");
    }
  }

  public static void assertNotEmpty(List<?> liveLines) {
    if (liveLines == null || liveLines.isEmpty()) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          REORDER_EMPTY,
          "Nothing is below reorder on this outlet.");
    }
  }

  public static String fingerprint(List<FingerprintLine> lines) {
    List<FingerprintLine> sorted = new ArrayList<>(lines);
    sorted.sort(Comparator.comparing(FingerprintLine::productId));
    StringBuilder body = new StringBuilder();
    for (FingerprintLine line : sorted) {
      body.append(line.productId())
          .append('|')
          .append(line.onHand().toPlainString())
          .append('|')
          .append(line.suggestedOrderQty())
          .append('\n');
    }
    try {
      byte[] digest =
          MessageDigest.getInstance("SHA-256")
              .digest(body.toString().getBytes(StandardCharsets.UTF_8));
      return HexFormat.of().formatHex(digest);
    } catch (NoSuchAlgorithmException ex) {
      throw new IllegalStateException(ex);
    }
  }

  public static String unmappedReason(
      boolean productUsable,
      List<UUID> activeSupplierIds,
      boolean inactiveMatch,
      int suggestedQty,
      Long unitRatePaise) {
    if (!productUsable) {
      return PRODUCT_INACTIVE;
    }
    if (suggestedQty <= 0) {
      return ZERO_QTY;
    }
    if (activeSupplierIds.size() > 1) {
      return AMBIGUOUS;
    }
    if (activeSupplierIds.isEmpty()) {
      return inactiveMatch ? SUPPLIER_INACTIVE : UNMAPPED;
    }
    if (unitRatePaise == null || unitRatePaise <= 0) {
      return NO_RATE;
    }
    return null;
  }

  public static BigDecimal quantity(int suggestedQty) {
    if (suggestedQty <= 0) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY, ZERO_QTY, "Suggested order quantity must be positive.");
    }
    return BigDecimal.valueOf(suggestedQty);
  }

  public static PurchaseOrderStatus bulkTarget(String action) {
    if (BULK_ISSUE.equals(action)) {
      return PurchaseOrderStatus.ISSUED;
    }
    if (BULK_CANCEL.equals(action)) {
      return PurchaseOrderStatus.CANCELLED;
    }
    throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
  }

  public static String bulkAuditAction(PurchaseOrderStatus target) {
    return target == PurchaseOrderStatus.ISSUED
        ? "PURCHASE_ORDER_BULK_ISSUE"
        : "PURCHASE_ORDER_BULK_CANCEL";
  }

  public record FingerprintLine(UUID productId, BigDecimal onHand, int suggestedOrderQty) {}
}
