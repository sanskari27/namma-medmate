package com.nammamedmate.server.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.nammamedmate.server.shared.exception.ApiException;
import org.junit.jupiter.api.Test;

class ReportAccessPolicyTest {

  @Test
  void ac01_freeIncludesDayBookSalesAndPurchaseOnly() {
    assertThat(ReportAccessPolicy.entitled(PlanCode.FREE, ReportCapability.DAY_BOOK)).isTrue();
    assertThat(ReportAccessPolicy.entitled(PlanCode.FREE, ReportCapability.SALES_SUMMARY)).isTrue();
    assertThat(ReportAccessPolicy.entitled(PlanCode.FREE, ReportCapability.PURCHASE_SUMMARY))
        .isTrue();
    assertThat(ReportAccessPolicy.entitled(PlanCode.FREE, ReportCapability.EXPENSE_SUMMARY))
        .isFalse();
    assertThat(ReportAccessPolicy.entitled(PlanCode.FREE, ReportCapability.NEAR_EXPIRY)).isFalse();
    assertThat(ReportAccessPolicy.entitled(PlanCode.FREE, ReportCapability.GST)).isFalse();
    assertThat(ReportAccessPolicy.entitled(PlanCode.FREE, ReportCapability.PROFIT_AND_LOSS))
        .isFalse();
    assertThat(ReportAccessPolicy.entitled(PlanCode.FREE, ReportCapability.BRANCH_PNL)).isFalse();
    assertThat(ReportAccessPolicy.entitled(PlanCode.FREE, ReportCapability.AGING)).isFalse();
    assertThat(ReportAccessPolicy.entitled(PlanCode.FREE, ReportCapability.ANALYTICS)).isFalse();
    assertThat(ReportAccessPolicy.entitled(PlanCode.FREE, ReportCapability.CUSTOM_REPORT))
        .isFalse();
  }

  @Test
  void ac02_starterAddsExpenseAndNearExpiryGrowthAddsTheRest() {
    assertThat(ReportAccessPolicy.entitled(PlanCode.STARTER, ReportCapability.EXPENSE_SUMMARY))
        .isTrue();
    assertThat(ReportAccessPolicy.entitled(PlanCode.STARTER, ReportCapability.NEAR_EXPIRY))
        .isTrue();
    assertThat(ReportAccessPolicy.entitled(PlanCode.STARTER, ReportCapability.GST)).isFalse();
    assertThat(ReportAccessPolicy.entitled(PlanCode.STARTER, ReportCapability.AGING)).isFalse();
    assertThat(ReportAccessPolicy.entitled(PlanCode.STARTER, ReportCapability.ANALYTICS)).isFalse();
    assertThat(ReportAccessPolicy.entitled(PlanCode.STARTER, ReportCapability.CUSTOM_REPORT))
        .isFalse();
    assertThat(ReportAccessPolicy.entitled(PlanCode.GROWTH, ReportCapability.GST)).isTrue();
    assertThat(ReportAccessPolicy.entitled(PlanCode.GROWTH, ReportCapability.AGING)).isTrue();
    assertThat(ReportAccessPolicy.entitled(PlanCode.GROWTH, ReportCapability.ANALYTICS)).isTrue();
    assertThat(ReportAccessPolicy.entitled(PlanCode.GROWTH, ReportCapability.CUSTOM_REPORT))
        .isTrue();
    assertThat(ReportAccessPolicy.entitled(PlanCode.PRO, ReportCapability.BRANCH_PNL)).isTrue();
    assertThat(ReportAccessPolicy.entitled(PlanCode.PRO, ReportCapability.NEAR_EXPIRY)).isTrue();
  }

  @Test
  void ac04_expiredOrCancelledSubscriptionCountsAsFreeForReports() {
    assertThat(ReportAccessPolicy.reportPlan(PlanCode.GROWTH, SubscriptionStatus.EXPIRED))
        .isEqualTo(PlanCode.FREE);
    assertThat(ReportAccessPolicy.reportPlan(PlanCode.PRO, SubscriptionStatus.CANCELLED))
        .isEqualTo(PlanCode.FREE);
    assertThat(ReportAccessPolicy.reportPlan(PlanCode.STARTER, SubscriptionStatus.ACTIVE))
        .isEqualTo(PlanCode.STARTER);
  }

  @Test
  void ac03_deniedEntitlementHasUpgradeHintAndNoLeakOnAssert() {
    ReportAccessPolicy.CatalogEntitlement gst =
        ReportAccessPolicy.entitlement(PlanCode.FREE, ReportCapability.GST);
    assertThat(gst.entitled()).isFalse();
    assertThat(gst.minPlan()).isEqualTo("GROWTH");
    assertThat(gst.upgradeHint()).contains("Growth");
    assertThatThrownBy(() -> ReportAccessPolicy.assertEntitled(PlanCode.FREE, ReportCapability.GST))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(ReportAccessPolicy.PLAN_LIMIT);
    ReportAccessPolicy.assertEntitled(PlanCode.FREE, ReportCapability.DAY_BOOK);
  }

  @Test
  void financeAndComplianceKeysMapWithoutTreatingUnknownAsPlanLimit() {
    assertThat(ReportAccessPolicy.capability(FinanceReportKey.DAY_BOOK))
        .isEqualTo(ReportCapability.DAY_BOOK);
    assertThat(ReportAccessPolicy.capability(FinanceReportKey.GSTR1))
        .isEqualTo(ReportCapability.GST);
    assertThat(ReportAccessPolicy.capability(FinanceReportKey.GSTR3B))
        .isEqualTo(ReportCapability.GST);
    assertThat(ReportAccessPolicy.capability(ComplianceReportKey.NEAR_EXPIRY))
        .isEqualTo(ReportCapability.NEAR_EXPIRY);
    assertThat(ReportAccessPolicy.capability(ComplianceReportKey.H1_SALES)).isNull();
    assertThat(ReportAccessPolicy.capability(ComplianceReportKey.EXPIRED)).isNull();
  }
}
