package com.nammamedmate.server.application.offer;

import com.nammamedmate.server.domain.OfferBenefitType;
import com.nammamedmate.server.domain.OfferKind;
import com.nammamedmate.server.domain.OfferProductSlot;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record OfferCommand(
    String name,
    OfferKind kind,
    Integer priority,
    Instant startsAt,
    Instant endsAt,
    Integer buyQuantity,
    Integer getQuantity,
    OfferBenefitType benefitType,
    Long benefitValue,
    Integer expectedVersion,
    List<ProductRef> products) {

  public record ProductRef(UUID productId, OfferProductSlot slot) {}
}
