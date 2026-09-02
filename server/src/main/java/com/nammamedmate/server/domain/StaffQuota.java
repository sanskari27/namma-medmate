package com.nammamedmate.server.domain;

public final class StaffQuota {

  public static final int FREE_TOTAL_USERS = 3;

  private StaffQuota() {}

  public static boolean allowsAnother(long currentNonDeletedUsers) {
    return currentNonDeletedUsers < FREE_TOTAL_USERS;
  }
}
