package com.nammamedmate.server.domain;

public final class BranchCodeGenerator {

  private BranchCodeGenerator() {}

  public static String nextCode(long existingCount) {
    long sequence = existingCount + 1;
    if (sequence < 1 || sequence > 99) {
      throw new IllegalArgumentException("Branch sequence out of range");
    }
    return "BR" + String.format("%02d", sequence);
  }
}
