package com.nammamedmate.server.domain;

public final class StaffQuota {

  /**
   * @deprecated Prefer {@link PlanLimits#maxUsers(PlanCode)}.
   */
  public static final int FREE_TOTAL_USERS = PlanLimits.maxUsers(PlanCode.FREE);

  private StaffQuota() {}

  public static boolean allowsAnother(long currentNonDeletedUsers) {
    return PlanLimits.allowsAnotherUser(PlanCode.FREE, currentNonDeletedUsers);
  }

  public static boolean allowsAnother(PlanCode plan, long currentNonDeletedUsers) {
    return PlanLimits.allowsAnotherUser(plan, currentNonDeletedUsers);
  }
}
