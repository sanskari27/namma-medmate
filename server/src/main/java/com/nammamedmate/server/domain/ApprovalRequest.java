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
@Table(name = "approval_request")
@Getter
@Setter
public class ApprovalRequest {

  @Id private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "branch_id")
  private UUID branchId;

  @Column(name = "rule_id", nullable = false)
  private UUID ruleId;

  @Column(name = "requester_user_id", nullable = false)
  private UUID requesterUserId;

  @Enumerated(EnumType.STRING)
  @Column(name = "module_code", nullable = false, length = 32)
  private ModuleCode moduleCode;

  @Enumerated(EnumType.STRING)
  @Column(name = "action_key", nullable = false, length = 64)
  private ApprovalActionKey actionKey;

  @Column(name = "amount_value")
  private Integer amountValue;

  @Column(name = "threshold_snapshot")
  private Integer thresholdSnapshot;

  @Column(name = "rule_version_snapshot", nullable = false)
  private int ruleVersionSnapshot;

  @Column(name = "context_json")
  private String contextJson;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 16)
  private ApprovalRequestStatus status;

  @Column(name = "idempotency_key", length = 128)
  private String idempotencyKey;

  @Column(nullable = false)
  private int version = 1;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;
}
