package com.nammamedmate.server.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.nammamedmate.server.shared.exception.ApiException;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class ApprovalPolicyTest {

  @Test
  void rejectsMissingApprovalsModule() {
    assertThatThrownBy(() -> ApprovalPolicy.requireApprovalsModule(false))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo("FORBIDDEN");
  }

  @Test
  void rejectsSelfApprovalWhenProhibited() {
    UUID user = UUID.randomUUID();
    assertThatThrownBy(() -> ApprovalPolicy.rejectSelfApprovalIfProhibited(false, user, user))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo("SELF_APPROVAL");
  }

  @Test
  void allowsSelfApprovalWhenConfigured() {
    UUID user = UUID.randomUUID();
    ApprovalPolicy.rejectSelfApprovalIfProhibited(true, user, user);
  }

  @Test
  void rejectsChangedThresholdSnapshot() {
    assertThatThrownBy(() -> ApprovalPolicy.requireMatchingRuleSnapshot(1, 1000, 2, 1000))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo("THRESHOLD_CHANGED");
  }

  @Test
  void rejectsStaleRequestVersion() {
    assertThatThrownBy(() -> ApprovalPolicy.requirePendingVersion(1, 2))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo("STALE_STATE");
  }

  @Test
  void retentionIsNinetyDays() {
    Instant now = Instant.parse("2026-09-03T00:00:00Z");
    Instant old = Instant.parse("2026-05-01T00:00:00Z");
    Instant recent = Instant.parse("2026-08-01T00:00:00Z");
    assertThat(ApprovalPolicy.withinRetention(old, now)).isFalse();
    assertThat(ApprovalPolicy.withinRetention(recent, now)).isTrue();
    assertThat(ApprovalPolicy.retentionCutoff(now))
        .isEqualTo(Instant.parse("2026-06-05T00:00:00Z"));
  }
}
