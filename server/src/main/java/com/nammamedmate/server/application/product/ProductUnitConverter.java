package com.nammamedmate.server.application.product;

import com.nammamedmate.server.domain.ProductUnit;
import com.nammamedmate.server.shared.exception.ApiException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Map;
import org.springframework.http.HttpStatus;

public final class ProductUnitConverter {

  private ProductUnitConverter() {}

  public static void assertValidFactor(BigDecimal factor, int quantityPrecision) {
    if (factor == null || factor.compareTo(BigDecimal.ZERO) <= 0) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          "INVALID_CONVERSION",
          "Conversion factors must be positive.");
    }
    assertFitsPrecision(factor, quantityPrecision);
  }

  public static BigDecimal toBase(
      BigDecimal quantity,
      ProductUnit fromUnit,
      ProductUnit baseUnit,
      Map<ProductUnit, BigDecimal> factors,
      int quantityPrecision) {
    BigDecimal base = quantity.multiply(factorFor(fromUnit, baseUnit, factors));
    return scaleAndAssert(base, quantityPrecision);
  }

  public static BigDecimal fromBase(
      BigDecimal baseQuantity,
      ProductUnit toUnit,
      ProductUnit baseUnit,
      Map<ProductUnit, BigDecimal> factors,
      int quantityPrecision) {
    BigDecimal factor = factorFor(toUnit, baseUnit, factors);
    BigDecimal display = baseQuantity.divide(factor, 12, RoundingMode.HALF_UP);
    return scaleAndAssert(display, quantityPrecision);
  }

  public static BigDecimal convert(
      BigDecimal quantity,
      ProductUnit fromUnit,
      ProductUnit toUnit,
      ProductUnit baseUnit,
      Map<ProductUnit, BigDecimal> factors,
      int quantityPrecision) {
    BigDecimal base = toBase(quantity, fromUnit, baseUnit, factors, quantityPrecision);
    if (toUnit == baseUnit) {
      return base;
    }
    return fromBase(base, toUnit, baseUnit, factors, quantityPrecision);
  }

  private static BigDecimal factorFor(
      ProductUnit unit, ProductUnit baseUnit, Map<ProductUnit, BigDecimal> factors) {
    if (unit == baseUnit) {
      return BigDecimal.ONE;
    }
    BigDecimal factor = factors.get(unit);
    if (factor == null) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY, "UNKNOWN_UNIT", "Unit is not defined for this product.");
    }
    return factor;
  }

  private static BigDecimal scaleAndAssert(BigDecimal value, int quantityPrecision) {
    BigDecimal normalized = value.stripTrailingZeros();
    int scale = Math.max(normalized.scale(), 0);
    if (scale > quantityPrecision) {
      throw precisionLoss();
    }
    return normalized;
  }

  private static void assertFitsPrecision(BigDecimal value, int quantityPrecision) {
    BigDecimal stripped = value.stripTrailingZeros();
    int scale = Math.max(stripped.scale(), 0);
    if (scale > quantityPrecision) {
      throw precisionLoss();
    }
  }

  private static ApiException precisionLoss() {
    return new ApiException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        "PRECISION_LOSS",
        "Quantity exceeds the product allowed precision.");
  }
}
