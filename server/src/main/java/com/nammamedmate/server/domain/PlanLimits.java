package com.nammamedmate.server.domain;

public final class PlanLimits {

  public static final int UNLIMITED_USERS = Integer.MAX_VALUE;

  private PlanLimits() {}

  public static int maxUsers(PlanCode plan) {
    return switch (plan) {
      case FREE, STARTER -> 3;
      case GROWTH -> 5;
      case PRO -> UNLIMITED_USERS;
    };
  }

  public static int maxBranches(PlanCode plan) {
    return switch (plan) {
      case FREE -> 1;
      case STARTER -> 2;
      case GROWTH -> 3;
      case PRO -> 5;
    };
  }

  public static int effectiveBranchLimit(PlanCode plan, Integer branchLimitOverride) {
    if (branchLimitOverride != null && branchLimitOverride > 0) {
      return branchLimitOverride;
    }
    return maxBranches(plan);
  }

  public static boolean allowsAnotherUser(PlanCode plan, long currentNonDeletedUsers) {
    int max = maxUsers(plan);
    return max == UNLIMITED_USERS || currentNonDeletedUsers < max;
  }

  public static boolean allowsAnotherBranch(
      PlanCode plan, Integer branchLimitOverride, long currentBranches) {
    return currentBranches < effectiveBranchLimit(plan, branchLimitOverride);
  }

  public static boolean usageFitsPlan(
      PlanCode plan, Integer branchLimitOverride, long users, long branches) {
    int max = maxUsers(plan);
    if (max != UNLIMITED_USERS && users > max) {
      return false;
    }
    return branches <= effectiveBranchLimit(plan, branchLimitOverride);
  }
}
