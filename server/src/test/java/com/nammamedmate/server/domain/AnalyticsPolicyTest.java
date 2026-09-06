package com.nammamedmate.server.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.nammamedmate.server.shared.exception.ApiException;
import java.time.LocalDate;
import java.util.Set;
import org.junit.jupiter.api.Test;

class AnalyticsPolicyTest {

  @Test
  void ac01_wowUsesEquivalentMondaySundayWeeks() {
    LocalDate sunday = LocalDate.of(2026, 9, 6);
    AnalyticsPolicy.Window window = AnalyticsPolicy.wow(sunday);
    assertThat(window.from()).isEqualTo(LocalDate.of(2026, 8, 31));
    assertThat(window.to()).isEqualTo(LocalDate.of(2026, 9, 6));
    assertThat(window.priorFrom()).isEqualTo(LocalDate.of(2026, 8, 24));
    assertThat(window.priorTo()).isEqualTo(LocalDate.of(2026, 8, 30));
    assertThat(window.currentDays()).isEqualTo(window.priorDays()).isEqualTo(7);
  }

  @Test
  void ac01_momUsesEquivalentCalendarMonthsEvenWhenDayCountsDiffer() {
    LocalDate inSeptember = LocalDate.of(2026, 9, 6);
    AnalyticsPolicy.Window window = AnalyticsPolicy.mom(inSeptember);
    assertThat(window.from()).isEqualTo(LocalDate.of(2026, 9, 1));
    assertThat(window.to()).isEqualTo(LocalDate.of(2026, 9, 30));
    assertThat(window.priorFrom()).isEqualTo(LocalDate.of(2026, 8, 1));
    assertThat(window.priorTo()).isEqualTo(LocalDate.of(2026, 8, 31));
    assertThat(window.currentDays()).isEqualTo(30);
    assertThat(window.priorDays()).isEqualTo(31);
  }

  @Test
  void ac05_customWindowsMustHaveEqualDayCounts() {
    LocalDate today = LocalDate.of(2026, 9, 6);
    AnalyticsPolicy.Window equal =
        AnalyticsPolicy.custom(
            LocalDate.of(2026, 8, 31),
            LocalDate.of(2026, 9, 6),
            LocalDate.of(2026, 8, 24),
            LocalDate.of(2026, 8, 30),
            today);
    assertThat(equal.currentDays()).isEqualTo(7);
    assertThatThrownBy(
            () ->
                AnalyticsPolicy.custom(
                    LocalDate.of(2026, 9, 1),
                    LocalDate.of(2026, 9, 6),
                    LocalDate.of(2026, 8, 1),
                    LocalDate.of(2026, 8, 31),
                    today))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(AnalyticsPolicy.RANGE_UNSUPPORTED);
  }

  @Test
  void ac05_oversizedLimitAndRangeAreRejected() {
    assertThat(AnalyticsPolicy.requireLimit(null)).isEqualTo(AnalyticsPolicy.TOP_SELLERS_MAX);
    assertThat(AnalyticsPolicy.requireLimit(5)).isEqualTo(5);
    assertThatThrownBy(() -> AnalyticsPolicy.requireLimit(11))
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(AnalyticsPolicy.RANGE_UNSUPPORTED);
    assertThatThrownBy(
            () ->
                AnalyticsPolicy.custom(
                    LocalDate.of(2025, 1, 1),
                    LocalDate.of(2026, 1, 3),
                    LocalDate.of(2023, 1, 1),
                    LocalDate.of(2024, 1, 3),
                    LocalDate.of(2026, 9, 6)))
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(AnalyticsPolicy.RANGE_UNSUPPORTED);
  }

  @Test
  void ac04_growthAndProAreEntitledFreeAndStarterAreNot() {
    AnalyticsPolicy.assertEntitled(PlanCode.GROWTH);
    AnalyticsPolicy.assertEntitled(PlanCode.PRO);
    assertThatThrownBy(() -> AnalyticsPolicy.assertEntitled(PlanCode.FREE))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(AnalyticsPolicy.PLAN_LIMIT);
    assertThatThrownBy(() -> AnalyticsPolicy.assertEntitled(PlanCode.STARTER))
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(AnalyticsPolicy.PLAN_LIMIT);
  }

  @Test
  void ac04_ownerOrReportingStaffMayOpenCashierMayNot() {
    AnalyticsPolicy.requireAccess(AppUserRole.pharmacy_owner, Set.of());
    AnalyticsPolicy.requireAccess(
        AppUserRole.pharmacy_staff, Set.of(ModuleCode.REPORTING, ModuleCode.FINANCE));
    assertThatThrownBy(
            () ->
                AnalyticsPolicy.requireAccess(AppUserRole.pharmacy_staff, Set.of(ModuleCode.SALES)))
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(AnalyticsPolicy.FORBIDDEN);
  }

  @Test
  void ac03_chartKeysAreHistoricalOnly() {
    assertThat(AnalyticsPolicy.chartKeys())
        .containsExactly("salesTrend", "topSellers", "slowDeadStock", "customerFrequency");
    assertThat(AnalyticsPolicy.chartKeys())
        .doesNotContain("forecast", "stockoutInDays", "predicted");
  }

  @Test
  void ac02_slowAndDeadThresholdsAreExplicit() {
    assertThat(AnalyticsPolicy.classify(java.math.BigDecimal.TEN, 0))
        .isEqualTo(AnalyticsPolicy.CLASS_DEAD);
    assertThat(AnalyticsPolicy.classify(java.math.BigDecimal.ONE, 3))
        .isEqualTo(AnalyticsPolicy.CLASS_SLOW);
    assertThat(AnalyticsPolicy.classify(java.math.BigDecimal.ONE, 6)).isNull();
    assertThat(AnalyticsPolicy.classify(java.math.BigDecimal.ZERO, 0)).isNull();
  }
}
