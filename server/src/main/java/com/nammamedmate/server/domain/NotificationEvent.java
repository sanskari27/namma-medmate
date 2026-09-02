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
@Table(name = "notification_event")
@Getter
@Setter
public class NotificationEvent {

  @Id private UUID id;

  @Column(name = "event_key", nullable = false, unique = true, length = 128)
  private String eventKey;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 64)
  private NotificationTrigger trigger;

  @Column(name = "tenant_id")
  private UUID tenantId;

  @Column(name = "branch_id")
  private UUID branchId;

  @Column(name = "source_record_id", nullable = false)
  private UUID sourceRecordId;

  @Column(name = "affected_user_id")
  private UUID affectedUserId;

  @Enumerated(EnumType.STRING)
  @Column(name = "approver_role", length = 32)
  private RoutingRole approverRole;

  @Column(name = "customer_id")
  private UUID customerId;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;
}
