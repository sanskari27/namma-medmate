package com.nammamedmate.server.domain;

public enum StockAdjustmentReason {
  DAMAGE_BREAKAGE,
  EXPIRY_WRITE_OFF,
  THEFT_LOSS,
  PHYSICAL_COUNT,
  SAMPLE_FREE_GOODS;

  public boolean allowsIncrease() {
    return this == PHYSICAL_COUNT;
  }
}
