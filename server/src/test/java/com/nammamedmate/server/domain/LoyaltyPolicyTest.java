package com.nammamedmate.server.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.nammamedmate.server.shared.exception.ApiException;
import org.junit.jupiter.api.Test;

class LoyaltyPolicyTest {

  @Test
  void earnRoundsNearestPointPerHundredRupeesTaxablePaid() {
    assertThat(LoyaltyPolicy.earnPoints(0L)).isEqualTo(0L);
    assertThat(LoyaltyPolicy.earnPoints(4999L)).isEqualTo(0L);
    assertThat(LoyaltyPolicy.earnPoints(5000L)).isEqualTo(1L);
    assertThat(LoyaltyPolicy.earnPoints(10000L)).isEqualTo(1L);
    assertThat(LoyaltyPolicy.earnPoints(15000L)).isEqualTo(2L);
  }

  @Test
  void redeemIsOneRupeePerPointCappedAtTwentyPercentOfGrandTotal() {
    assertThat(LoyaltyPolicy.redeemPaise(1L)).isEqualTo(100L);
    assertThat(LoyaltyPolicy.maxRedeemPoints(11200L)).isEqualTo(22L);
    LoyaltyPolicy.assertRedeem(22L, 100L, 11200L);
    assertThatThrownBy(() -> LoyaltyPolicy.assertRedeem(23L, 100L, 11200L))
        .isInstanceOf(ApiException.class)
        .extracting("code")
        .isEqualTo(LoyaltyPolicy.REDEEM_LIMIT);
  }

  @Test
  void redeemCannotExceedBalanceOrGoNegative() {
    assertThatThrownBy(() -> LoyaltyPolicy.assertRedeem(5L, 4L, 100000L))
        .isInstanceOf(ApiException.class)
        .extracting("code")
        .isEqualTo(LoyaltyPolicy.INSUFFICIENT_POINTS);
    assertThatThrownBy(() -> LoyaltyPolicy.assertRedeem(-1L, 10L, 100000L))
        .isInstanceOf(ApiException.class)
        .extracting("code")
        .isEqualTo("VALIDATION_ERROR");
  }

  @Test
  void growthAndProAreEntitledAndLowerPlansAreFrozen() {
    assertThat(LoyaltyPolicy.entitled(PlanCode.GROWTH)).isTrue();
    assertThat(LoyaltyPolicy.entitled(PlanCode.PRO)).isTrue();
    assertThat(LoyaltyPolicy.entitled(PlanCode.STARTER)).isFalse();
    assertThat(LoyaltyPolicy.entitled(PlanCode.FREE)).isFalse();
    assertThatThrownBy(() -> LoyaltyPolicy.assertEntitled(PlanCode.STARTER))
        .isInstanceOf(ApiException.class)
        .extracting("code")
        .isEqualTo(LoyaltyPolicy.PLAN_LIMIT);
  }
}
