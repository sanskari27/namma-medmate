package com.nammamedmate.server.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "sales_offer_product")
@Getter
@Setter
public class SalesOfferProduct {

  @Id private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "offer_id", nullable = false)
  private UUID offerId;

  @Column(name = "product_id", nullable = false)
  private UUID productId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 16)
  private OfferProductSlot slot;
}
