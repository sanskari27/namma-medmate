package com.nammamedmate.server.application.approval;

import com.nammamedmate.server.domain.ApprovalActionKey;
import com.nammamedmate.server.domain.ApprovalDecisionOutcome;
import com.nammamedmate.server.domain.ApprovalRequestStatus;
import com.nammamedmate.server.domain.ModuleCode;
import java.time.Instant;
import java.util.UUID;

public record ApprovalRequestView(
    UUID id,
    UUID tenantId,
    UUID branchId,
    UUID ruleId,
    UUID requesterUserId,
    ModuleCode moduleCode,
    ApprovalActionKey actionKey,
    Integer amountValue,
    Integer thresholdSnapshot,
    int ruleVersionSnapshot,
    String contextJson,
    ApprovalRequestStatus status,
    int version,
    Instant createdAt,
    ApprovalDecisionOutcome decisionOutcome,
    UUID decisionActorUserId) {}
