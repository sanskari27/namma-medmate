package com.nammamedmate.server.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.nammamedmate.server.shared.exception.ApiException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class SalesReturnPolicyTest {

  @Test
  void ac01_reasonAndDecisionAreRecorded() {
    assertThat(SalesReturnPolicy.requireReason("  Wrong strength dispensed  "))
        .isEqualTo("Wrong strength dispensed");
    assertThatThrownBy(() -> SalesReturnPolicy.requireReason(" "))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(SalesReturnPolicy.REASON_REQUIRED);
    assertThat(SalesReturnPolicy.requireDecision("APPROVED"))
        .isEqualTo(SalesReturnDecision.APPROVED);
    assertThatThrownBy(() -> SalesReturnPolicy.requireDecision("REJECTED"))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo("VALIDATION_ERROR");
  }

  @Test
  void ac02_returnBeyondNetSoldIsRejected() {
    SalesReturnPolicy.assertWithinNetSold(new BigDecimal("4"), new BigDecimal("4"));
    assertThatThrownBy(
            () -> SalesReturnPolicy.assertWithinNetSold(new BigDecimal("4"), new BigDecimal("5")))
        .isInstanceOf(ApiException.class)
        .satisfies(ex -> assertUnprocessable((ApiException) ex, SalesReturnPolicy.OVER_RETURN));
  }

  @Test
  void ac02_quantityMustBePositive() {
    assertThat(SalesReturnPolicy.assertQuantity(new BigDecimal("2.50")))
        .isEqualByComparingTo("2.5");
    assertThatThrownBy(() -> SalesReturnPolicy.assertQuantity(BigDecimal.ZERO))
        .isInstanceOf(ApiException.class)
        .satisfies(
            ex -> assertUnprocessable((ApiException) ex, SalesReturnPolicy.INVALID_QUANTITY));
  }

  @Test
  void ac03_expiredOriginatingBatchIsRejected() {
    LocalDate today = LocalDate.of(2026, 9, 5);
    SalesReturnPolicy.assertBatchNotExpired(LocalDate.of(2026, 9, 5), today);
    SalesReturnPolicy.assertBatchNotExpired(null, today);
    assertThatThrownBy(
            () -> SalesReturnPolicy.assertBatchNotExpired(LocalDate.of(2026, 9, 4), today))
        .isInstanceOf(ApiException.class)
        .satisfies(ex -> assertUnprocessable((ApiException) ex, SalesReturnPolicy.BATCH_EXPIRED));
  }

  @Test
  void ac03_nonReturnableProductIsRejected() {
    SalesReturnPolicy.assertProductReturnable(true);
    assertThatThrownBy(() -> SalesReturnPolicy.assertProductReturnable(false))
        .isInstanceOf(ApiException.class)
        .satisfies(ex -> assertUnprocessable((ApiException) ex, SalesReturnPolicy.NOT_RETURNABLE));
  }

  @Test
  void ac04_refundIsProportionalToTheSoldLineHalfUp() {
    assertThat(
            SalesReturnPolicy.refundAmountPaise(10000L, new BigDecimal("2"), new BigDecimal("4")))
        .isEqualTo(5000L);
    assertThat(
            SalesReturnPolicy.refundAmountPaise(11200L, new BigDecimal("1"), new BigDecimal("3")))
        .isEqualTo(3733L);
    assertThat(SalesReturnPolicy.refundAmountPaise(1001L, new BigDecimal("1"), new BigDecimal("2")))
        .isEqualTo(501L);
    assertThat(
            SalesReturnPolicy.refundAmountPaise(11200L, new BigDecimal("3"), new BigDecimal("3")))
        .isEqualTo(11200L);
  }

  @Test
  void ac04_refundModeIsCashOrCreditNote() {
    assertThat(SalesReturnPolicy.requireRefundMode("cash")).isEqualTo(SalesReturnRefundMode.CASH);
    assertThat(SalesReturnPolicy.requireRefundMode("CREDIT_NOTE"))
        .isEqualTo(SalesReturnRefundMode.CREDIT_NOTE);
    assertThatThrownBy(() -> SalesReturnPolicy.requireRefundMode("UPI"))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo("VALIDATION_ERROR");
  }

  @Test
  void ac04_creditNoteNeedsAKhataCustomer() {
    SalesReturnPolicy.assertCreditNoteCustomer(SalesReturnRefundMode.CASH, null);
    SalesReturnPolicy.assertCreditNoteCustomer(SalesReturnRefundMode.CREDIT_NOTE, UUID.randomUUID());
    assertThatThrownBy(
            () ->
                SalesReturnPolicy.assertCreditNoteCustomer(SalesReturnRefundMode.CREDIT_NOTE, null))
        .isInstanceOf(ApiException.class)
        .satisfies(
            ex ->
                assertUnprocessable(
                    (ApiException) ex, SalesReturnPolicy.CREDIT_NOTE_CUSTOMER_REQUIRED));
  }

  @Test
  void ac05_emptyLinesAndBlankIdempotencyKeysAreRejected() {
    assertThatThrownBy(() -> SalesReturnPolicy.assertLinesPresent(List.of()))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(SalesReturnPolicy.LINES_REQUIRED);
    assertThat(SalesReturnPolicy.requireIdempotencyKey(" sr-1 ")).isEqualTo("sr-1");
    assertThatThrownBy(() -> SalesReturnPolicy.requireIdempotencyKey(null))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo("VALIDATION_ERROR");
  }

  @Test
  void ac05_replayWithDifferentPayloadConflicts() {
    ApiException conflict = SalesReturnPolicy.idempotencyConflict();
    assertThat(conflict.getCode()).isEqualTo(SalesReturnPolicy.IDEMPOTENCY_CONFLICT);
    assertThat(conflict.getStatus()).isEqualTo(HttpStatus.CONFLICT);
  }

  private static void assertUnprocessable(ApiException api, String code) {
    assertThat(api.getCode()).isEqualTo(code);
    assertThat(api.getStatus()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
  }
}
