package com.nammamedmate.server.application.inventory;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record SaveStockTakeCountsCommand(List<Line> lines) {

  public record Line(UUID lineId, BigDecimal countedQuantity) {}
}
