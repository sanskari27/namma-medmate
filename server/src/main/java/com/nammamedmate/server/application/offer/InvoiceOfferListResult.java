package com.nammamedmate.server.application.offer;

import com.nammamedmate.server.domain.OfferKind;
import java.util.List;
import java.util.UUID;

public record InvoiceOfferListResult(List<Item> items) {

  public record Item(
      UUID id, String name, OfferKind kind, int priority, String explanation, long benefitPaise) {}
}
