package com.nammamedmate.server.application.offer;

import com.nammamedmate.server.domain.OfferBenefitType;
import com.nammamedmate.server.domain.OfferKind;
import com.nammamedmate.server.domain.OfferProductSlot;
import com.nammamedmate.server.domain.OfferStatus;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record OfferView(
    UUID id,
    UUID tenantId,
    String name,
    OfferKind kind,
    OfferStatus status,
    int priority,
    Instant startsAt,
    Instant endsAt,
    Integer buyQuantity,
    Integer getQuantity,
    OfferBenefitType benefitType,
    long benefitValue,
    int version,
    List<ProductView> products,
    Instant createdAt,
    Instant updatedAt) {

  public record ProductView(UUID productId, OfferProductSlot slot) {}
}
