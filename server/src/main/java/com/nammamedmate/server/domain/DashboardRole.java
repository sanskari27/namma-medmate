package com.nammamedmate.server.domain;

import java.util.Locale;

public enum DashboardRole {
  CASHIER,
  INVENTORY,
  ACCOUNTANT,
  OWNER;

  public String wireName() {
    return name().toLowerCase(Locale.ROOT);
  }
}
