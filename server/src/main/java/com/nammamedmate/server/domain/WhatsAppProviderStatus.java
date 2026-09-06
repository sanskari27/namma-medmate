package com.nammamedmate.server.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "whatsapp_provider_status")
@Getter
@Setter
public class WhatsAppProviderStatus {

  @Id private UUID id;

  @Column(name = "display_number", nullable = false, length = 32)
  private String displayNumber;

  @Column(name = "phone_number_id", nullable = false, length = 64)
  private String phoneNumberId;

  @Column(nullable = false, length = 24)
  private String health;

  @Column(name = "synced_at", nullable = false)
  private Instant syncedAt;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;
}
