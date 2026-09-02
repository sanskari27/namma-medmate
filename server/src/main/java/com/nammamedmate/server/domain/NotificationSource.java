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
@Table(name = "notification_source")
@Getter
@Setter
public class NotificationSource {

  @Id private UUID id;

  @Column(name = "tenant_id")
  private UUID tenantId;

  @Column(name = "branch_id")
  private UUID branchId;

  @Column(nullable = false)
  private String href;

  @Column(name = "deleted_at")
  private Instant deletedAt;

  @Column(name = "access_revoked_at")
  private Instant accessRevokedAt;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;
}
