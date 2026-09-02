package com.nammamedmate.server.application.approval;

import com.nammamedmate.server.domain.ApprovalDecisionOutcome;

public record DecideApprovalCommand(
    ApprovalDecisionOutcome outcome, String note, int requestVersion) {}
