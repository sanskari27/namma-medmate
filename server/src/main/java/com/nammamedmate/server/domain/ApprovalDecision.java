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
@Table(name = "approval_decision")
@Getter
@Setter
public class ApprovalDecision {

  @Id private UUID id;

  @Column(name = "request_id", nullable = false)
  private UUID requestId;

  @Column(name = "actor_user_id", nullable = false)
  private UUID actorUserId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 16)
  private ApprovalDecisionOutcome outcome;

  @Column(length = 500)
  private String note;

  @Column(name = "rule_version_snapshot", nullable = false)
  private int ruleVersionSnapshot;

  @Column(name = "threshold_snapshot")
  private Integer thresholdSnapshot;

  @Column(name = "decided_at", nullable = false)
  private Instant decidedAt;
}
