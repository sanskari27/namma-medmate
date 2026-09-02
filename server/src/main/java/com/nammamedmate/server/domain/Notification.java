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
@Table(name = "notification")
@Getter
@Setter
public class Notification {

  @Id private UUID id;

  @Column(name = "recipient_user_id", nullable = false)
  private UUID recipientUserId;

  @Column(name = "tenant_id")
  private UUID tenantId;

  @Column(name = "branch_id")
  private UUID branchId;

  @Column(nullable = false)
  private String title;

  private String body;

  @Column(name = "source_type", nullable = false)
  private String sourceType;

  @Column(name = "source_id", nullable = false)
  private UUID sourceId;

  @Column(nullable = false)
  private String href;

  @Column(name = "read_at")
  private Instant readAt;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;
}
