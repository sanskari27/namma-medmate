package com.nammamedmate.server.application.product;

import com.nammamedmate.server.domain.ProductUnit;
import java.math.BigDecimal;
import java.util.List;

public record ProductUnitsReplaceCommand(Integer quantityPrecision, List<UnitFactor> units) {

  public record UnitFactor(ProductUnit unit, BigDecimal factorToBase) {}
}
