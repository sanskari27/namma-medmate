package com.nammamedmate.server.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.nammamedmate.server.shared.exception.ApiException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class PurchaseReturnPolicyTest {

  @Test
  void ac02_overReturnIsRejected() {
    PurchaseReturnPolicy.assertReturnable(new BigDecimal("6"), new BigDecimal("6"));
    assertThatThrownBy(
            () -> PurchaseReturnPolicy.assertReturnable(new BigDecimal("6"), new BigDecimal("7")))
        .isInstanceOf(ApiException.class)
        .satisfies(ex -> assertCode((ApiException) ex, PurchaseReturnPolicy.OVER_RETURN));
  }

  @Test
  void ac03_overpaymentIsRejected() {
    PurchaseReturnPolicy.assertPayment(4000, 6000);
    assertThatThrownBy(() -> PurchaseReturnPolicy.assertPayment(7000, 6000))
        .isInstanceOf(ApiException.class)
        .satisfies(ex -> assertCode((ApiException) ex, PurchaseReturnPolicy.OVERPAYMENT));
  }

  @Test
  void ac04_dueDateUsesCreditPeriod() {
    LocalDate invoice = LocalDate.of(2026, 9, 4);
    assertThat(PurchaseReturnPolicy.dueOn(invoice, SupplierPaymentTerms.CREDIT, 30))
        .isEqualTo(LocalDate.of(2026, 10, 4));
    assertThat(PurchaseReturnPolicy.dueOn(invoice, SupplierPaymentTerms.COD, 30))
        .isEqualTo(invoice);
    assertThat(PurchaseReturnPolicy.dueOn(invoice, SupplierPaymentTerms.CREDIT, null))
        .isEqualTo(invoice);
  }

  @Test
  void ac04_lineAmountIsPaiseHalfUp() {
    assertThat(PurchaseReturnPolicy.lineAmountPaise(new BigDecimal("4"), 10000)).isEqualTo(40000L);
    assertThat(PurchaseReturnPolicy.lineAmountPaise(new BigDecimal("1.5"), 10001))
        .isEqualTo(15002L);
  }

  @Test
  void ac04_debitNoteNumberUsesFinancialYearAndBranch() {
    assertThat(PurchaseReturnPolicy.debitNoteNumber("2026-27", "BR01", 1))
        .isEqualTo("DN/2026-27/BR01/00001");
  }

  @Test
  void ac05_staleBalanceConflicts() {
    PurchaseReturnPolicy.assertExpectedVersion(2L, 2L);
    assertThatThrownBy(() -> PurchaseReturnPolicy.assertExpectedVersion(2L, 1L))
        .isInstanceOf(ApiException.class)
        .satisfies(
            ex -> {
              ApiException api = (ApiException) ex;
              assertThat(api.getCode()).isEqualTo(PurchaseReturnPolicy.STALE_STATE);
              assertThat(api.getStatus()).isEqualTo(HttpStatus.CONFLICT);
            });
  }

  @Test
  void ac04_freeAndStarterCannotReadDueReminders() {
    PurchaseReturnPolicy.assertDueRemindersEntitled(PlanCode.GROWTH);
    PurchaseReturnPolicy.assertDueRemindersEntitled(PlanCode.PRO);
    assertThatThrownBy(() -> PurchaseReturnPolicy.assertDueRemindersEntitled(PlanCode.FREE))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(PurchaseReturnPolicy.PLAN_LIMIT);
    assertThatThrownBy(() -> PurchaseReturnPolicy.assertDueRemindersEntitled(PlanCode.STARTER))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(PurchaseReturnPolicy.PLAN_LIMIT);
  }

  @Test
  void ac05_emptyLinesAreRejected() {
    assertThatThrownBy(() -> PurchaseReturnPolicy.assertLinesPresent(List.of()))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(PurchaseReturnPolicy.LINES_REQUIRED);
  }

  private static void assertCode(ApiException api, String code) {
    assertThat(api.getCode()).isEqualTo(code);
    assertThat(api.getStatus()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
  }
}
