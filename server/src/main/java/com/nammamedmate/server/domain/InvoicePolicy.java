package com.nammamedmate.server.domain;

import com.nammamedmate.server.shared.exception.ApiException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;
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
  public static final String EXCESSIVE_DISCOUNT = "EXCESSIVE_DISCOUNT";
  public static final String JURISDICTION_INVALID = "JURISDICTION_INVALID";
  public static final String TAX_RATE_INVALID = "TAX_RATE_INVALID";
  public static final String APPROVAL_REQUIRED = "APPROVAL_REQUIRED";
  public static final String REASON_REQUIRED = "REASON_REQUIRED";

  private static final Pattern GSTIN =
      Pattern.compile("^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$");
  private static final Set<BigDecimal> GST_RATES =
      Set.of(
          new BigDecimal("0"),
          new BigDecimal("5"),
          new BigDecimal("12"),
          new BigDecimal("18"),
          new BigDecimal("28"));

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
    return lineMoney(quantity, sellingPricePaise, discountPaise, gstRate, TaxJurisdiction.INTRA);
  }

  public static LineMoney lineMoney(
      BigDecimal quantity,
      long sellingPricePaise,
      long discountPaise,
      BigDecimal gstRate,
      TaxJurisdiction jurisdiction) {
    long gross = lineGross(quantity, sellingPricePaise);
    if (discountPaise > gross) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          PRICE_INVALID,
          "Discount cannot exceed the line selling amount.");
    }
    Split tax = gstSplit(gross - discountPaise, gstRate, jurisdiction);
    return new LineMoney(
        gross - discountPaise,
        tax.taxPaise(),
        tax.cgstPaise(),
        tax.sgstPaise(),
        tax.igstPaise(),
        gross - discountPaise + tax.taxPaise(),
        discountPaise);
  }

  public static PricedBill priceBill(
      List<LinePriceInput> lines,
      DiscountType billType,
      long billValue,
      TaxJurisdiction jurisdiction) {
    if (lines == null || lines.isEmpty()) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY, LINES_REQUIRED, "Add at least one medicine line.");
    }
    TaxJurisdiction split = jurisdiction == null ? TaxJurisdiction.INTRA : jurisdiction;
    List<Long> remaining = new ArrayList<>();
    List<Long> lineDiscounts = new ArrayList<>();
    List<Long> grosses = new ArrayList<>();
    long grossSum = 0L;
    long remainingSum = 0L;
    for (LinePriceInput line : lines) {
      long gross = lineGross(line.quantity(), line.sellingPricePaise());
      long lineDiscount =
          lineDiscountPaise(gross, line.discountType(), line.discountValue())
              + Math.max(0L, line.offerBenefitPaise());
      if (lineDiscount > gross) {
        throw excessive();
      }
      long left = gross - lineDiscount;
      grosses.add(gross);
      lineDiscounts.add(lineDiscount);
      remaining.add(left);
      grossSum += gross;
      remainingSum += left;
    }
    long billDiscount = billDiscountPaise(remainingSum, billType, billValue);
    if (billDiscount > remainingSum) {
      throw excessive();
    }
    List<Long> allocated = allocate(remaining, remainingSum, billDiscount);
    List<PricedLine> priced = new ArrayList<>();
    long discountSum = 0L;
    long taxableSum = 0L;
    long taxSum = 0L;
    long cgstSum = 0L;
    long sgstSum = 0L;
    long igstSum = 0L;
    for (int i = 0; i < lines.size(); i++) {
      long taxable = remaining.get(i) - allocated.get(i);
      Split tax = gstSplit(taxable, lines.get(i).gstRate(), split);
      long lineDiscount = lineDiscounts.get(i) + allocated.get(i);
      discountSum += lineDiscount;
      taxableSum += taxable;
      taxSum += tax.taxPaise();
      cgstSum += tax.cgstPaise();
      sgstSum += tax.sgstPaise();
      igstSum += tax.igstPaise();
      priced.add(
          new PricedLine(
              grosses.get(i),
              lineDiscounts.get(i),
              allocated.get(i),
              taxable,
              tax.taxPaise(),
              tax.cgstPaise(),
              tax.sgstPaise(),
              tax.igstPaise(),
              taxable + tax.taxPaise(),
              lineDiscount));
    }
    int bps = effectiveDiscountBps(discountSum, grossSum);
    return new PricedBill(
        grossSum,
        discountSum,
        taxableSum,
        taxSum,
        cgstSum,
        sgstSum,
        igstSum,
        0L,
        taxableSum + taxSum,
        bps,
        List.copyOf(priced));
  }

  public static TaxJurisdiction jurisdiction(String branchGstin, String customerGstin) {
    String customer = optionalGstin(customerGstin);
    if (customer == null) {
      return TaxJurisdiction.INTRA;
    }
    String branch = optionalGstin(branchGstin);
    if (branch == null) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          JURISDICTION_INVALID,
          "Outlet GSTIN is needed before billing a registered GSTIN.");
    }
    return branch.substring(0, 2).equals(customer.substring(0, 2))
        ? TaxJurisdiction.INTRA
        : TaxJurisdiction.INTER;
  }

  public static String optionalGstin(String gstin) {
    if (gstin == null || gstin.isBlank()) {
      return null;
    }
    String upper = gstin.trim().toUpperCase(Locale.ROOT);
    if (!GSTIN.matcher(upper).matches()) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY, JURISDICTION_INVALID, "GSTIN is not valid.");
    }
    return upper;
  }

  public static BigDecimal requireGstRate(BigDecimal gstRate) {
    if (gstRate == null) {
      return BigDecimal.ZERO;
    }
    boolean allowed = GST_RATES.stream().anyMatch(rate -> rate.compareTo(gstRate) == 0);
    if (!allowed) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY, TAX_RATE_INVALID, "That GST rate is not allowed.");
    }
    BigDecimal normalized = gstRate.stripTrailingZeros();
    if (normalized.scale() < 0) {
      return normalized.setScale(0);
    }
    return normalized;
  }

  public static String requireReason(String reason) {
    if (reason == null || reason.isBlank()) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY, REASON_REQUIRED, "Record why the GST rate changed.");
    }
    String trimmed = reason.trim();
    if (trimmed.length() > 500) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY, REASON_REQUIRED, "Record why the GST rate changed.");
    }
    return trimmed;
  }

  public static boolean discountExceedsThreshold(int effectiveBps, Integer thresholdBps) {
    return thresholdBps != null && effectiveBps > thresholdBps;
  }

  public static void assertDiscountReady(DiscountApprovalStatus status) {
    if (status == DiscountApprovalStatus.PENDING || status == DiscountApprovalStatus.REJECTED) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          APPROVAL_REQUIRED,
          "This discount is waiting for sign-off.");
    }
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

  private static long lineGross(BigDecimal quantity, long sellingPricePaise) {
    return quantity
        .multiply(BigDecimal.valueOf(sellingPricePaise))
        .setScale(0, RoundingMode.HALF_UP)
        .longValueExact();
  }

  private static long lineDiscountPaise(long gross, DiscountType type, long value) {
    if (type == null || type == DiscountType.NONE || value == 0L) {
      return 0L;
    }
    if (value < 0L) {
      throw excessive();
    }
    if (type == DiscountType.FLAT) {
      return value;
    }
    if (value > 10000L) {
      throw excessive();
    }
    return BigDecimal.valueOf(gross)
        .multiply(BigDecimal.valueOf(value))
        .divide(BigDecimal.valueOf(10000), 0, RoundingMode.HALF_UP)
        .longValueExact();
  }

  private static long billDiscountPaise(long remainingSum, DiscountType type, long value) {
    return lineDiscountPaise(remainingSum, type == null ? DiscountType.NONE : type, value);
  }

  private static List<Long> allocate(List<Long> remaining, long remainingSum, long billDiscount) {
    List<Long> allocated = new ArrayList<>(remaining.size());
    if (billDiscount == 0L || remainingSum == 0L) {
      for (int i = 0; i < remaining.size(); i++) {
        allocated.add(0L);
      }
      return allocated;
    }
    long used = 0L;
    for (int i = 0; i < remaining.size(); i++) {
      if (i == remaining.size() - 1) {
        allocated.add(billDiscount - used);
      } else {
        long share =
            BigDecimal.valueOf(billDiscount)
                .multiply(BigDecimal.valueOf(remaining.get(i)))
                .divide(BigDecimal.valueOf(remainingSum), 0, RoundingMode.HALF_UP)
                .longValueExact();
        allocated.add(share);
        used += share;
      }
    }
    return allocated;
  }

  private static Split gstSplit(long taxable, BigDecimal gstRate, TaxJurisdiction jurisdiction) {
    long tax = 0L;
    if (gstRate != null && gstRate.compareTo(BigDecimal.ZERO) > 0) {
      tax =
          BigDecimal.valueOf(taxable)
              .multiply(gstRate)
              .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP)
              .longValueExact();
    }
    if (jurisdiction == TaxJurisdiction.INTER) {
      return new Split(tax, 0L, 0L, tax);
    }
    long cgst = tax / 2;
    return new Split(tax, cgst, tax - cgst, 0L);
  }

  private static int effectiveDiscountBps(long discountPaise, long grossPaise) {
    if (grossPaise <= 0L || discountPaise <= 0L) {
      return 0;
    }
    return BigDecimal.valueOf(discountPaise)
        .multiply(BigDecimal.valueOf(10000))
        .divide(BigDecimal.valueOf(grossPaise), 0, RoundingMode.HALF_UP)
        .intValueExact();
  }

  private static ApiException excessive() {
    return new ApiException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        EXCESSIVE_DISCOUNT,
        "Discount cannot exceed the selling amount.");
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

  public record LinePriceInput(
      BigDecimal quantity,
      long sellingPricePaise,
      DiscountType discountType,
      long discountValue,
      BigDecimal gstRate,
      long offerBenefitPaise) {

    public LinePriceInput(
        BigDecimal quantity,
        long sellingPricePaise,
        DiscountType discountType,
        long discountValue,
        BigDecimal gstRate) {
      this(quantity, sellingPricePaise, discountType, discountValue, gstRate, 0L);
    }
  }

  public record PricedLine(
      long grossPaise,
      long lineDiscountPaise,
      long billDiscountPaise,
      long taxablePaise,
      long taxPaise,
      long cgstPaise,
      long sgstPaise,
      long igstPaise,
      long totalPaise,
      long discountPaise) {}

  public record PricedBill(
      long grossPaise,
      long discountPaise,
      long subtotalPaise,
      long taxPaise,
      long cgstPaise,
      long sgstPaise,
      long igstPaise,
      long roundOffPaise,
      long totalPaise,
      int effectiveDiscountBps,
      List<PricedLine> lines) {}

  private record Split(long taxPaise, long cgstPaise, long sgstPaise, long igstPaise) {}
}
