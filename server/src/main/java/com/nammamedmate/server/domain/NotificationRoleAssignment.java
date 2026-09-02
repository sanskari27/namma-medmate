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
@Table(name = "notification_role_assignment")
@Getter
@Setter
public class NotificationRoleAssignment {

  @Id private UUID id;

  @Column(name = "user_id", nullable = false)
  private UUID userId;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "branch_id")
  private UUID branchId;

  @Enumerated(EnumType.STRING)
  @Column(name = "routing_role", nullable = false, length = 32)
  private RoutingRole routingRole;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;
}
