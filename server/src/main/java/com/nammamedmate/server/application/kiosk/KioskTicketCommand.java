package com.nammamedmate.server.application.kiosk;

import java.util.List;
import java.util.UUID;

public record KioskTicketCommand(
    String walkInName,
    String pickupRequest,
    String paymentMethod,
    List<Item> items) {

  public record Item(
      UUID productId,
      String name,
      String packLabel,
      Integer quantity,
      Long unitPricePaise,
      Boolean prescriptionRequired) {}
}
