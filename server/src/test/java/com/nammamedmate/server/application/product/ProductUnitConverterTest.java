package com.nammamedmate.server.application.product;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.nammamedmate.server.domain.ProductUnit;
import com.nammamedmate.server.shared.exception.ApiException;
import java.math.BigDecimal;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class ProductUnitConverterTest {

  @Test
  void toBase_multipliesByFactor() {
    BigDecimal base =
        ProductUnitConverter.toBase(
            new BigDecimal("2"),
            ProductUnit.strip,
            ProductUnit.Tablet,
            Map.of(ProductUnit.strip, new BigDecimal("10")),
            0);
    assertThat(base).isEqualByComparingTo("20");
  }

  @Test
  void fromBase_dividesByFactor() {
    BigDecimal display =
        ProductUnitConverter.fromBase(
            new BigDecimal("20"),
            ProductUnit.strip,
            ProductUnit.Tablet,
            Map.of(ProductUnit.strip, new BigDecimal("10")),
            0);
    assertThat(display).isEqualByComparingTo("2");
  }

  @Test
  void convert_betweenAlternatesViaBase() {
    Map<ProductUnit, BigDecimal> factors =
        Map.of(ProductUnit.strip, new BigDecimal("10"), ProductUnit.box, new BigDecimal("100"));
    BigDecimal boxes =
        ProductUnitConverter.convert(
            new BigDecimal("2"),
            ProductUnit.strip,
            ProductUnit.box,
            ProductUnit.Tablet,
            factors,
            1);
    assertThat(boxes).isEqualByComparingTo("0.2");
  }

  @Test
  void rejectsZeroOrNegativeFactor() {
    assertThatThrownBy(() -> ProductUnitConverter.assertValidFactor(new BigDecimal("0"), 0))
        .isInstanceOf(ApiException.class)
        .satisfies(
            ex -> {
              ApiException api = (ApiException) ex;
              assertThat(api.getStatus()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
              assertThat(api.getCode()).isEqualTo("INVALID_CONVERSION");
            });
  }

  @Test
  void rejectsPrecisionLosingFactorWhenPrecisionIsZero() {
    assertThatThrownBy(() -> ProductUnitConverter.assertValidFactor(new BigDecimal("10.5"), 0))
        .isInstanceOf(ApiException.class)
        .satisfies(ex -> assertThat(((ApiException) ex).getCode()).isEqualTo("PRECISION_LOSS"));
  }

  @Test
  void rejectsPrecisionLosingConversionResult() {
    assertThatThrownBy(
            () ->
                ProductUnitConverter.convert(
                    new BigDecimal("1"),
                    ProductUnit.Tablet,
                    ProductUnit.strip,
                    ProductUnit.Tablet,
                    Map.of(ProductUnit.strip, new BigDecimal("10")),
                    0))
        .isInstanceOf(ApiException.class)
        .satisfies(ex -> assertThat(((ApiException) ex).getCode()).isEqualTo("PRECISION_LOSS"));
  }
}
