package com.nammamedmate.server.domain;

import java.util.List;

public final class PlanCatalogue {

  public record PlanOffer(
      PlanCode code,
      int pricePaiseMonthly,
      int maxUsers,
      int maxBranches,
      List<ModuleCode> entitledModules) {}

  private PlanCatalogue() {}

  public static List<PlanOffer> all() {
    return List.of(
        offer(PlanCode.FREE, 0),
        offer(PlanCode.STARTER, 69_900),
        offer(PlanCode.GROWTH, 149_900),
        offer(PlanCode.PRO, 299_900));
  }

  public static int pricePaiseMonthly(PlanCode code) {
    return all().stream()
        .filter(offer -> offer.code() == code)
        .mapToInt(PlanOffer::pricePaiseMonthly)
        .findFirst()
        .orElse(0);
  }

  private static PlanOffer offer(PlanCode code, int pricePaiseMonthly) {
    return new PlanOffer(
        code,
        pricePaiseMonthly,
        PlanLimits.maxUsers(code),
        PlanLimits.maxBranches(code),
        List.copyOf(PlanModuleEntitlements.entitledTenantModules(code)));
  }
}
