package com.nammamedmate.server.application.hospital;

import java.time.Instant;
import java.util.List;

public record HospitalStatementView(
    long openingPaise,
    long suppliedPaise,
    long creditsPaise,
    long closingPaise,
    long balancePaise,
    long accountVersion,
    String institutionName,
    Aging ageing,
    List<Line> lines) {

  public record Line(
      Instant occurredAt,
      String kind,
      String particulars,
      long debitPaise,
      long creditPaise,
      long balancePaise) {}

  public record Aging(
      long d0_30,
      long d31_60,
      long d61_90,
      long d90Plus,
      long overduePaise,
      int oldestDaysPastDue) {}
}
