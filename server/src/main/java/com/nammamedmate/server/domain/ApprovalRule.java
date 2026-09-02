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
@Table(name = "approval_rule")
@Getter
@Setter
public class ApprovalRule {

  @Id private UUID id;

  @Column(name = "tenant_id")
  private UUID tenantId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 16)
  private AccessScope scope;

  @Enumerated(EnumType.STRING)
  @Column(name = "module_code", nullable = false, length = 32)
  private ModuleCode moduleCode;

  @Enumerated(EnumType.STRING)
  @Column(name = "action_key", nullable = false, length = 64)
  private ApprovalActionKey actionKey;

  @Column(name = "threshold_value")
  private Integer thresholdValue;

  @Enumerated(EnumType.STRING)
  @Column(name = "approver_type", nullable = false, length = 16)
  private ApproverType approverType;

  @Enumerated(EnumType.STRING)
  @Column(name = "approver_account_class", length = 32)
  private AppUserRole approverAccountClass;

  @Column(name = "approver_role_id")
  private UUID approverRoleId;

  @Column(name = "allow_self_approval", nullable = false)
  private boolean allowSelfApproval;

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
