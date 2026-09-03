package com.nammamedmate.server.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "kiosk_session")
@Getter
@Setter
public class KioskSession {

  @Id private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "branch_id", nullable = false)
  private UUID branchId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 16)
  private KioskSessionStatus status;

  @Column(name = "opened_by", nullable = false)
  private UUID openedBy;

  @Column(name = "opened_at", nullable = false)
  private Instant openedAt;

  @Column(name = "closed_by")
  private UUID closedBy;

  @Column(name = "closed_at")
  private Instant closedAt;

  @Column(name = "next_token", nullable = false)
  private int nextToken = 1;

  @Version
  @Column(nullable = false)
  private int version;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;
}
