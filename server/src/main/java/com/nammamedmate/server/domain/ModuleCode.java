package com.nammamedmate.server.domain;

public enum ModuleCode {
  SALES(true, false),
  INVENTORY(true, false),
  PROCUREMENT(true, false),
  CRM(true, false),
  FINANCE(true, false),
  REPORTING(true, false),
  COMPLIANCE(true, false),
  STAFF(true, false),
  ROLES(true, false),
  APPROVALS(true, false),
  LOYALTY(true, true),
  KIOSK(true, true),
  /** Phase 2 ecommerce — neither tenant nor platform in Phase 1 (D-008). */
  ONLINE_STORE(false, false, false),
  TENANT_KYC(false, false),
  STAFF_VERIFICATION(false, false),
  SUBSCRIPTIONS(false, false),
  SUPPORT(false, false),
  PLATFORM_OPERATORS(false, false),
  PLATFORM_ROLES(false, false),
  PLATFORM_FINANCE(false, false);

  private final boolean tenant;
  private final boolean platform;
  private final boolean planGated;

  ModuleCode(boolean tenant, boolean planGated) {
    this(tenant, !tenant, planGated);
  }

  ModuleCode(boolean tenant, boolean platform, boolean planGated) {
    this.tenant = tenant;
    this.platform = platform;
    this.planGated = planGated;
  }

  public boolean tenantModule() {
    return tenant;
  }

  public boolean platformModule() {
    return platform;
  }

  public boolean planGated() {
    return planGated;
  }
}
