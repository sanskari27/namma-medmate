package com.nammamedmate.server.domain;

import java.time.Duration;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

public final class ApprovalPolicy {

  public static final Duration AUDIT_RETENTION = Duration.ofDays(90);

  private ApprovalPolicy() {}

  public static void requireApprovalsModule(boolean hasApprovals) {
    if (!hasApprovals) {
      throw new com.nammamedmate.server.shared.exception.ApiException(
          org.springframework.http.HttpStatus.FORBIDDEN,
          "FORBIDDEN",
          "Approvals module permission is required");
    }
  }

  public static void rejectSelfApprovalIfProhibited(
      boolean allowSelfApproval, UUID requesterId, UUID actorId) {
    if (!allowSelfApproval && Objects.equals(requesterId, actorId)) {
      throw new com.nammamedmate.server.shared.exception.ApiException(
          org.springframework.http.HttpStatus.UNPROCESSABLE_ENTITY,
          "SELF_APPROVAL",
          "Self-approval is not allowed for this rule");
    }
  }

  public static void requireMatchingRuleSnapshot(
      int requestRuleVersion,
      Integer requestThreshold,
      int currentRuleVersion,
      Integer currentThreshold) {
    if (requestRuleVersion != currentRuleVersion
        || !Objects.equals(requestThreshold, currentThreshold)) {
      throw new com.nammamedmate.server.shared.exception.ApiException(
          org.springframework.http.HttpStatus.CONFLICT,
          "THRESHOLD_CHANGED",
          "Approval rule changed since this request was created");
    }
  }

  public static void requirePendingVersion(int expected, int actual) {
    if (expected != actual) {
      throw new com.nammamedmate.server.shared.exception.ApiException(
          org.springframework.http.HttpStatus.CONFLICT,
          "STALE_STATE",
          "Approval request was updated by someone else");
    }
  }

  public static Instant retentionCutoff(Instant now) {
    return now.minus(AUDIT_RETENTION);
  }

  public static boolean withinRetention(Instant createdAt, Instant now) {
    return createdAt != null && !createdAt.isBefore(retentionCutoff(now));
  }
}
