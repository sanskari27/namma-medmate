package com.nammamedmate.server.application.sales;

import com.nammamedmate.server.domain.DiscountType;
import java.util.List;
import java.util.UUID;

public record InvoicePricingCommand(
    Integer expectedVersion,
    String customerGstin,
    DiscountType billDiscountType,
    Long billDiscountValue,
    List<LineDiscount> lines) {

  public record LineDiscount(UUID productId, DiscountType type, Long value) {}
}
