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
@Table(name = "saved_login")
@Getter
@Setter
public class SavedLogin {

  @Id private UUID id;

  @Column(name = "device_id", nullable = false)
  private UUID deviceId;

  @Column(name = "user_id", nullable = false)
  private UUID userId;

  @Column(name = "tenant_id")
  private UUID tenantId;

  @Column(name = "expires_at", nullable = false)
  private Instant expiresAt;

  @Column(name = "revoked_at")
  private Instant revokedAt;

  @Column(name = "failed_attempts", nullable = false)
  private int failedAttempts;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "last_used_at", nullable = false)
  private Instant lastUsedAt;
}
