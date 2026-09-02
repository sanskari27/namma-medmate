package com.nammamedmate.server.application.approval;

import com.nammamedmate.server.domain.ApprovalActionKey;
import com.nammamedmate.server.domain.ModuleCode;
import java.util.UUID;

public record CreateApprovalRequestCommand(
    ModuleCode moduleCode,
    ApprovalActionKey actionKey,
    UUID branchId,
    Integer amountValue,
    String contextJson,
    String idempotencyKey) {}
