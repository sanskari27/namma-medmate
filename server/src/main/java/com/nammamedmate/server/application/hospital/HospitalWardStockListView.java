package com.nammamedmate.server.application.hospital;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record HospitalWardStockListView(List<Item> items) {

  public record Item(
      UUID wardId,
      String wardName,
      UUID productId,
      String productName,
      String sku,
      BigDecimal quantity,
      long creditPricePaise,
      long valuePaise) {}
}
