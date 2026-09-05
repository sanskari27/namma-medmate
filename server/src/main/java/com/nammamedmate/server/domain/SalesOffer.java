package com.nammamedmate.server.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "sales_offer")
@Getter
@Setter
public class SalesOffer {

  @Id private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(nullable = false, length = 120)
  private String name;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 16)
  private OfferKind kind;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 16)
  private OfferStatus status;

  @Column(nullable = false)
  private int priority;

  @Column(name = "starts_at")
  private Instant startsAt;

  @Column(name = "ends_at")
  private Instant endsAt;

  @Column(name = "buy_quantity")
  private Integer buyQuantity;

  @Column(name = "get_quantity")
  private Integer getQuantity;

  @Enumerated(EnumType.STRING)
  @Column(name = "benefit_type", nullable = false, length = 16)
  private OfferBenefitType benefitType;

  @Column(name = "benefit_value", nullable = false)
  private long benefitValue;

  @Column(nullable = false)
  private int version = 1;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;
}
