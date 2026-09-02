package com.nammamedmate.server.domain;

public enum ApprovalActionKey {
  SALES_DISCOUNT_PERCENT(ModuleCode.SALES, ApprovalThresholdUnit.BPS),
  INVENTORY_WRITE_OFF(ModuleCode.INVENTORY, ApprovalThresholdUnit.PAISE);

  private final ModuleCode module;
  private final ApprovalThresholdUnit unit;

  ApprovalActionKey(ModuleCode module, ApprovalThresholdUnit unit) {
    this.module = module;
    this.unit = unit;
  }

  public ModuleCode module() {
    return module;
  }

  public ApprovalThresholdUnit unit() {
    return unit;
  }
}
