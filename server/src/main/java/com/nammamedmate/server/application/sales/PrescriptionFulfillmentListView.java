package com.nammamedmate.server.application.sales;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record PrescriptionFulfillmentListView(List<Item> items) {

  public record Item(
      UUID productId,
      BigDecimal prescribedQuantity,
      BigDecimal fulfilledQuantity,
      BigDecimal remainingQuantity) {}
}
