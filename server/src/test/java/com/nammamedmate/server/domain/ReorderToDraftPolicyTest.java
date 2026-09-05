package com.nammamedmate.server.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.nammamedmate.server.shared.exception.ApiException;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class ReorderToDraftPolicyTest {

  @Test
  void ac04_freeAndStarterCannotDraftFromReorder() {
    ReorderToDraftPolicy.assertReorderDraftEntitled(PlanCode.GROWTH);
    ReorderToDraftPolicy.assertReorderDraftEntitled(PlanCode.PRO);
    assertThatThrownBy(() -> ReorderToDraftPolicy.assertReorderDraftEntitled(PlanCode.FREE))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(ReorderToDraftPolicy.PLAN_LIMIT);
    assertThatThrownBy(() -> ReorderToDraftPolicy.assertReorderDraftEntitled(PlanCode.STARTER))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(ReorderToDraftPolicy.PLAN_LIMIT);
  }

  @Test
  void ac05_bulkAndSpendAreProOnly() {
    ReorderToDraftPolicy.assertProPoTools(PlanCode.PRO);
    assertThatThrownBy(() -> ReorderToDraftPolicy.assertProPoTools(PlanCode.GROWTH))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(ReorderToDraftPolicy.PLAN_LIMIT);
  }

  @Test
  void ac02_fingerprintIsStableAcrossLineOrder() {
    UUID a = UUID.fromString("11111111-1111-1111-1111-111111111111");
    UUID b = UUID.fromString("22222222-2222-2222-2222-222222222222");
    String left =
        ReorderToDraftPolicy.fingerprint(
            List.of(
                new ReorderToDraftPolicy.FingerprintLine(b, new BigDecimal("3"), 50),
                new ReorderToDraftPolicy.FingerprintLine(a, new BigDecimal("1"), 20)));
    String right =
        ReorderToDraftPolicy.fingerprint(
            List.of(
                new ReorderToDraftPolicy.FingerprintLine(a, new BigDecimal("1"), 20),
                new ReorderToDraftPolicy.FingerprintLine(b, new BigDecimal("3"), 50)));
    assertThat(left).isEqualTo(right).hasSize(64);
  }

  @Test
  void ac06_staleFingerprintConflicts() {
    assertThatThrownBy(() -> ReorderToDraftPolicy.assertFingerprint("abc", "def"))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(ReorderToDraftPolicy.STALE_STATE);
  }

  @Test
  void ac03_unmappedReasonsDoNotChooseASupplier() {
    UUID supplier = UUID.randomUUID();
    assertThat(ReorderToDraftPolicy.unmappedReason(true, List.of(), false, 10, 100L))
        .isEqualTo(ReorderToDraftPolicy.UNMAPPED);
    assertThat(
            ReorderToDraftPolicy.unmappedReason(
                true, List.of(supplier, UUID.randomUUID()), false, 10, 100L))
        .isEqualTo(ReorderToDraftPolicy.AMBIGUOUS);
    assertThat(ReorderToDraftPolicy.unmappedReason(true, List.of(), true, 10, 100L))
        .isEqualTo(ReorderToDraftPolicy.SUPPLIER_INACTIVE);
    assertThat(ReorderToDraftPolicy.unmappedReason(false, List.of(supplier), false, 10, 100L))
        .isEqualTo(ReorderToDraftPolicy.PRODUCT_INACTIVE);
    assertThat(ReorderToDraftPolicy.unmappedReason(true, List.of(supplier), false, 0, 100L))
        .isEqualTo(ReorderToDraftPolicy.ZERO_QTY);
    assertThat(ReorderToDraftPolicy.unmappedReason(true, List.of(supplier), false, 10, null))
        .isEqualTo(ReorderToDraftPolicy.NO_RATE);
    assertThat(ReorderToDraftPolicy.unmappedReason(true, List.of(supplier), false, 10, 2500L))
        .isNull();
  }
}
