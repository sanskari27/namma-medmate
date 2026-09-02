package com.nammamedmate.server.application.approval;

import com.nammamedmate.server.domain.AccessScope;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.ApprovalActionKey;
import com.nammamedmate.server.domain.ApproverType;
import com.nammamedmate.server.domain.ModuleCode;
import java.util.UUID;

public record ApprovalRuleView(
    UUID id,
    UUID tenantId,
    AccessScope scope,
    ModuleCode moduleCode,
    ApprovalActionKey actionKey,
    Integer thresholdValue,
    ApproverType approverType,
    AppUserRole approverAccountClass,
    UUID approverRoleId,
    boolean allowSelfApproval,
    int version) {}
