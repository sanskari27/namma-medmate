package com.nammamedmate.server.application.product;

import com.nammamedmate.server.domain.ProductUnit;
import java.math.BigDecimal;
import java.util.List;

public record ProductUnitsView(
    ProductUnit baseUnit, int quantityPrecision, List<ProductUnitConversionView> units) {

  public record ProductUnitConversionView(ProductUnit unit, BigDecimal factorToBase, int version) {}
}
