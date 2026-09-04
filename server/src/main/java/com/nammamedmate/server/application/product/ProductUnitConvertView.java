package com.nammamedmate.server.application.product;

import com.nammamedmate.server.domain.ProductUnit;
import java.math.BigDecimal;

public record ProductUnitConvertView(
    BigDecimal quantity,
    ProductUnit unit,
    BigDecimal baseQuantity,
    ProductUnit baseUnit,
    BigDecimal displayQuantity,
    ProductUnit displayUnit,
    Integer conversionVersion,
    BigDecimal factorToBase) {}
