package com.nammamedmate.server.domain;

public enum ModuleCode {
  SALES(true, false),
  INVENTORY(true, false),
  PROCUREMENT(true, false),
  CRM(true, false),
  FINANCE(true, false),
  REPORTING(true, false),
  STAFF(true, false),
  ROLES(true, false),
  APPROVALS(true, false),
  LOYALTY(true, true),
  ONLINE_STORE(true, true),
  TENANT_KYC(false, false),
  STAFF_VERIFICATION(false, false),
  SUBSCRIPTIONS(false, false),
  SUPPORT(false, false),
  PLATFORM_OPERATORS(false, false),
  PLATFORM_ROLES(false, false),
  PLATFORM_FINANCE(false, false);

  private final boolean tenant;
  private final boolean planGated;

  ModuleCode(boolean tenant, boolean planGated) {
    this.tenant = tenant;
    this.planGated = planGated;
  }

  public boolean tenantModule() {
    return tenant;
  }

  public boolean platformModule() {
    return !tenant;
  }

  public boolean planGated() {
    return planGated;
  }
}
