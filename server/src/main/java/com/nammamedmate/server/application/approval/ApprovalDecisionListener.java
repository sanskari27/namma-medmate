package com.nammamedmate.server.application.approval;

import com.nammamedmate.server.domain.ApprovalDecisionOutcome;
import java.time.Instant;
import java.util.UUID;

public interface ApprovalDecisionListener {

  void onDecided(
      UUID requestId, ApprovalDecisionOutcome outcome, UUID actorUserId, Instant decidedAt);
}
