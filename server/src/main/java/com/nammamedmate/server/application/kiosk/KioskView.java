package com.nammamedmate.server.application.kiosk;

import com.nammamedmate.server.domain.KioskSessionStatus;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record KioskView(
    boolean planEntitled,
    boolean hasModule,
    String branchType,
    UUID activeBranchId,
    String branchName,
    String blockReason,
    KioskSessionSlice session,
    KioskConfigSlice config,
    List<KioskTicketSlice> waitingTickets) {

  public record KioskSessionSlice(
      UUID id, KioskSessionStatus status, Instant openedAt, UUID openedBy) {}

  public record KioskConfigSlice(
      String displayName,
      String welcomeMessage,
      boolean staffExitPinSet,
      int idleResetSeconds,
      String accentTheme,
      boolean showPrices,
      boolean allowRxUpload,
      boolean acceptCash,
      boolean acceptUpi,
      boolean acceptCard,
      boolean acceptCod) {}

  public record KioskTicketSlice(
      UUID id,
      int token,
      String walkInName,
      String pickupRequest,
      String paymentMethod,
      boolean requiresRx,
      List<Map<String, Object>> items,
      Instant createdAt) {}
}
