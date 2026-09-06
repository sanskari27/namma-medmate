package com.nammamedmate.server.domain;

public enum AgingBucket {
  D0_30(0, 30, "0–30"),
  D31_60(31, 60, "31–60"),
  D61_90(61, 90, "61–90"),
  D90_PLUS(91, Integer.MAX_VALUE, "90+");

  private final int fromDays;
  private final int toDays;
  private final String label;

  AgingBucket(int fromDays, int toDays, String label) {
    this.fromDays = fromDays;
    this.toDays = toDays;
    this.label = label;
  }

  public int fromDays() {
    return fromDays;
  }

  public int toDays() {
    return toDays;
  }

  public String label() {
    return label;
  }
}
