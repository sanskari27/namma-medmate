package com.nammamedmate.server.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "app_user")
@Getter
@Setter
public class AppUser {

  @Id private UUID id;

  @Column(name = "tenant_id")
  private UUID tenantId;

  @Column(nullable = false, unique = true)
  private String email;

  @Column(name = "password_hash", nullable = false)
  private String passwordHash;

  @Column(name = "pin_hash")
  private String pinHash;

  @Column(name = "display_name", nullable = false)
  private String displayName;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 50)
  private AppUserRole role;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 32)
  private UserAccountStatus status = UserAccountStatus.ACTIVE;

  @Column(nullable = false)
  private boolean active = true;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  @Column(name = "deleted_at")
  private Instant deletedAt;

  @Column(name = "password_changed_at", nullable = false)
  private Instant passwordChangedAt;

  @Column(name = "must_change_password", nullable = false)
  private boolean mustChangePassword;

  @Column(name = "created_by")
  private UUID createdBy;

  @PrePersist
  void defaultPasswordChangedAt() {
    if (passwordChangedAt == null) {
      passwordChangedAt = createdAt != null ? createdAt : Instant.now();
    }
  }
}
