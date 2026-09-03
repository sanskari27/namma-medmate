package com.nammamedmate.server.application.kiosk;

import com.nammamedmate.server.domain.KioskSessionStatus;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record KioskView(
    boolean planEntitled,
    boolean hasModule,
    String branchType,
    UUID activeBranchId,
    String blockReason,
    KioskSessionSlice session,
    List<KioskTicketSlice> waitingTickets) {

  public record KioskSessionSlice(
      UUID id, KioskSessionStatus status, Instant openedAt, UUID openedBy) {}

  public record KioskTicketSlice(
      UUID id, int token, String walkInName, String pickupRequest, Instant createdAt) {}
}
