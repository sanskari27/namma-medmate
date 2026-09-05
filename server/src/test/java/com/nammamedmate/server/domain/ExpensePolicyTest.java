package com.nammamedmate.server.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.nammamedmate.server.shared.exception.ApiException;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class ExpensePolicyTest {

  private static final LocalDate TODAY = LocalDate.of(2026, 9, 6);

  @Test
  void ac01_systemCodesAreRentElectricitySalariesAndMiscellaneous() {
    assertThat(ExpensePolicy.SYSTEM_CODES)
        .containsExactly("RENT", "ELECTRICITY", "SALARIES", "MISCELLANEOUS");
    assertThat(ExpensePolicy.SYSTEM_LABELS.get("RENT")).isEqualTo("Rent");
    assertThat(ExpensePolicy.normalizeCode("  rent ")).isEqualTo("RENT");
  }

  @Test
  void ac01_customCategoryCannotReuseSystemCode() {
    assertThatThrownBy(() -> ExpensePolicy.requireCustomCode("rent"))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(ExpensePolicy.CATEGORY_TAKEN);
    assertThat(ExpensePolicy.requireCustomCode("water_bill")).isEqualTo("WATER_BILL");
  }

  @Test
  void ac02_amountMustBePositivePaiseAndOccurredDateRetained() {
    assertThat(ExpensePolicy.requireAmountPaise(1L)).isEqualTo(1L);
    assertThat(ExpensePolicy.requireOccurredOn(TODAY, TODAY)).isEqualTo(TODAY);
    assertThatThrownBy(() -> ExpensePolicy.requireAmountPaise(0L))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(ExpensePolicy.INVALID_AMOUNT);
    assertThatThrownBy(() -> ExpensePolicy.requireOccurredOn(TODAY.plusDays(1), TODAY))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(ExpensePolicy.INVALID_DATE);
  }

  @Test
  void ac05_closedPeriodIsNotConfigured() {
    assertThatCode(() -> ExpensePolicy.assertPeriodOpen(TODAY.minusYears(2)))
        .doesNotThrowAnyException();
  }

  @Test
  void ac01_expensesPostImmediatelyWithNoApprovalThreshold() {
    assertThat(ExpensePolicy.postedWriteStatus()).isEqualTo(ExpensePostingStatus.POSTED);
    assertThatCode(() -> ExpensePolicy.assertNoApprovalThreshold(9_999_999L))
        .doesNotThrowAnyException();
    assertThatCode(() -> ExpensePolicy.assertNoApprovalThreshold(1L)).doesNotThrowAnyException();
  }

  @Test
  void ac02_onlyPostedSpendCountsTowardReports() {
    assertThat(ExpensePolicy.countsTowardPostedReports(ExpensePostingStatus.POSTED)).isTrue();
    assertThat(ExpensePolicy.countsTowardPostedReports(ExpensePostingStatus.PENDING)).isFalse();
    assertThat(ExpensePolicy.countsTowardPostedReports(ExpensePostingStatus.REJECTED)).isFalse();
    assertThat(ExpensePolicy.parseListStatus(null)).isEqualTo(ExpensePostingStatus.POSTED);
    assertThat(ExpensePolicy.parseListStatus("pending")).isEqualTo(ExpensePostingStatus.PENDING);
    assertThatThrownBy(() -> ExpensePolicy.parseListStatus("held"))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo("VALIDATION_ERROR");
  }
}
