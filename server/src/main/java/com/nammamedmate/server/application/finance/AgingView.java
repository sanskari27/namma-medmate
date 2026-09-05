package com.nammamedmate.server.application.finance;

import com.nammamedmate.server.domain.AgingBucket;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record AgingView(
    LocalDate asOf,
    String scope,
    UUID branchId,
    long totalPaise,
    long sourceBalancePaise,
    List<BucketView> buckets,
    List<PartyView> items) {

  public record BucketView(AgingBucket key, String label, long totalPaise) {}

  public record PartyView(
      UUID partyId, String name, long amountPaise, int days, LocalDate ageOn, UUID branchId) {}
}
