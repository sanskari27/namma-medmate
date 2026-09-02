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
@Table(name = "access_role_event")
@Getter
@Setter
public class AccessRoleEvent {

  @Id private UUID id;

  @Column(name = "actor_user_id", nullable = false)
  private UUID actorUserId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 16)
  private AccessRoleEventAction action;

  @Column(name = "role_id")
  private UUID roleId;

  @Column(name = "target_user_id")
  private UUID targetUserId;

  @Column(name = "tenant_id")
  private UUID tenantId;

  @Column(name = "modules_snapshot", length = 512)
  private String modulesSnapshot;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;
}
