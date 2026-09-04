package com.nammamedmate.server.application.product;

import com.nammamedmate.server.domain.ProductUnit;
import java.math.BigDecimal;

public record ProductUnitConvertCommand(
    BigDecimal quantity, ProductUnit fromUnit, ProductUnit toUnit) {}
