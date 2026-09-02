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
@Table(name = "transactional_email")
@Getter
@Setter
public class TransactionalEmail {

  @Id private UUID id;

  @Column(name = "idempotency_key", nullable = false, unique = true, length = 128)
  private String idempotencyKey;

  @Column(name = "tenant_id")
  private UUID tenantId;

  @Enumerated(EnumType.STRING)
  @Column(name = "template_key", nullable = false, length = 32)
  private EmailTemplate template;

  @Column(name = "recipient_normalized", nullable = false, length = 320)
  private String recipient;

  @Column(name = "provider_message_id", length = 64)
  private String providerMessageId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 24)
  private EmailDeliveryStatus status;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;
}
