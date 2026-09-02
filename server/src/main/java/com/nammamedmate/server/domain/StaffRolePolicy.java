package com.nammamedmate.server.domain;

public final class StaffRolePolicy {

  private StaffRolePolicy() {}

  public static boolean canCreate(AppUserRole actor) {
    return actor == AppUserRole.pharmacy_owner || actor == AppUserRole.admin_super;
  }

  public static boolean canGrant(AppUserRole actor, AppUserRole granted) {
    if (actor == AppUserRole.pharmacy_owner) {
      return granted == AppUserRole.pharmacy_staff;
    }
    if (actor == AppUserRole.admin_super) {
      return granted == AppUserRole.admin_verification;
    }
    return false;
  }

  public static boolean canVerify(AppUserRole actor) {
    return actor == AppUserRole.admin_super || actor == AppUserRole.admin_verification;
  }
}
