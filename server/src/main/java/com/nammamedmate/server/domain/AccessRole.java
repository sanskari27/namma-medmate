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
@Table(name = "access_role")
@Getter
@Setter
public class AccessRole {

  @Id private UUID id;

  @Column(name = "tenant_id")
  private UUID tenantId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 16)
  private AccessScope scope;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 16)
  private AccessRoleKind kind;

  @Column(length = 64)
  private String code;

  @Column(nullable = false, length = 120)
  private String name;

  @Column(nullable = false)
  private int version = 1;

  @Column(name = "created_by")
  private UUID createdBy;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  @Column(name = "deleted_at")
  private Instant deletedAt;
}
