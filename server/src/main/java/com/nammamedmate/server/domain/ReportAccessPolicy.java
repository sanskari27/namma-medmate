package com.nammamedmate.server.domain;

import com.nammamedmate.server.shared.exception.ApiException;
import org.springframework.http.HttpStatus;

public final class ReportAccessPolicy {

  public static final String PLAN_LIMIT = "PLAN_LIMIT";

  private ReportAccessPolicy() {}

  public record CatalogEntitlement(boolean entitled, String minPlan, String upgradeHint) {}

  public static PlanCode reportPlan(PlanCode plan, SubscriptionStatus status) {
    if (status != SubscriptionStatus.ACTIVE) {
      return PlanCode.FREE;
    }
    return plan == null ? PlanCode.FREE : plan;
  }

  public static PlanCode minPlan(ReportCapability capability) {
    return switch (capability) {
      case DAY_BOOK, SALES_SUMMARY, PURCHASE_SUMMARY -> PlanCode.FREE;
      case EXPENSE_SUMMARY, NEAR_EXPIRY -> PlanCode.STARTER;
      case GST, PROFIT_AND_LOSS, BRANCH_PNL, AGING, ANALYTICS, CUSTOM_REPORT -> PlanCode.GROWTH;
    };
  }

  public static boolean entitled(PlanCode plan, ReportCapability capability) {
    PlanCode effective = plan == null ? PlanCode.FREE : plan;
    PlanCode min = minPlan(capability);
    return switch (min) {
      case FREE -> true;
      case STARTER ->
          effective == PlanCode.STARTER
              || effective == PlanCode.GROWTH
              || effective == PlanCode.PRO;
      case GROWTH, PRO -> effective == PlanCode.GROWTH || effective == PlanCode.PRO;
    };
  }

  public static String upgradeHint(ReportCapability capability) {
    return switch (capability) {
      case DAY_BOOK, SALES_SUMMARY, PURCHASE_SUMMARY -> null;
      case EXPENSE_SUMMARY, NEAR_EXPIRY ->
          "Expense summary and near-expiry are on Starter. Open the plan to turn them on.";
      case GST, PROFIT_AND_LOSS, BRANCH_PNL ->
          "GST and P&L are on Growth. Open the plan to turn them on.";
      case AGING -> "Khata and stockist aging is on Growth. Open the plan to turn it on.";
      case ANALYTICS -> "Growth or Pro is required to compare weeks and open trend charts.";
      case CUSTOM_REPORT -> "Growth or Pro is required to build an ad-hoc report.";
    };
  }

  public static CatalogEntitlement entitlement(PlanCode plan, ReportCapability capability) {
    boolean ok = entitled(plan, capability);
    return new CatalogEntitlement(
        ok, minPlan(capability).name(), ok ? null : upgradeHint(capability));
  }

  public static CatalogEntitlement openEntitlement() {
    return new CatalogEntitlement(true, PlanCode.FREE.name(), null);
  }

  public static void assertEntitled(PlanCode plan, ReportCapability capability) {
    if (!entitled(plan, capability)) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, PLAN_LIMIT, upgradeHint(capability));
    }
  }

  public static ReportCapability capability(FinanceReportKey key) {
    return switch (key) {
      case DAY_BOOK -> ReportCapability.DAY_BOOK;
      case SALES_SUMMARY -> ReportCapability.SALES_SUMMARY;
      case PURCHASE_SUMMARY -> ReportCapability.PURCHASE_SUMMARY;
      case EXPENSE_SUMMARY -> ReportCapability.EXPENSE_SUMMARY;
      case PROFIT_AND_LOSS -> ReportCapability.PROFIT_AND_LOSS;
      case GSTR1, GSTR3B -> ReportCapability.GST;
      case BRANCH_PNL -> ReportCapability.BRANCH_PNL;
    };
  }

  public static ReportCapability capability(ComplianceReportKey key) {
    return key == ComplianceReportKey.NEAR_EXPIRY ? ReportCapability.NEAR_EXPIRY : null;
  }
}
