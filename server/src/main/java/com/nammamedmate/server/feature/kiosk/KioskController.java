package com.nammamedmate.server.feature.kiosk;

import com.nammamedmate.server.application.kiosk.KioskConfigCommand;
import com.nammamedmate.server.application.kiosk.KioskService;
import com.nammamedmate.server.application.kiosk.KioskTicketCommand;
import com.nammamedmate.server.application.kiosk.KioskView;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.shared.web.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/kiosk")
public class KioskController {

  private final KioskService kioskService;

  public KioskController(KioskService kioskService) {
    this.kioskService = kioskService;
  }

  @GetMapping
  public ApiResponse<KioskResponse> current(Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toResponse(kioskService.current(principal)));
  }

  @PostMapping("/open")
  public ApiResponse<KioskResponse> open(Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toResponse(kioskService.open(principal)));
  }

  @PostMapping("/close")
  public ApiResponse<KioskResponse> close(Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toResponse(kioskService.close(principal)));
  }

  @PutMapping("/config")
  public ApiResponse<KioskResponse> saveConfig(
      Authentication authentication, @Valid @RequestBody ConfigRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toResponse(
            kioskService.saveConfig(
                principal,
                new KioskConfigCommand(
                    request.displayName(),
                    request.welcomeMessage(),
                    request.staffExitPin(),
                    request.idleResetSeconds(),
                    request.accentTheme(),
                    request.showPrices(),
                    request.allowRxUpload(),
                    request.acceptCash(),
                    request.acceptUpi(),
                    request.acceptCard(),
                    request.acceptCod()))));
  }

  @PostMapping("/tickets")
  public ApiResponse<KioskResponse> createTicket(
      Authentication authentication, @Valid @RequestBody CreateTicketRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    List<KioskTicketCommand.Item> items =
        request.items() == null
            ? List.of()
            : request.items().stream()
                .map(
                    item ->
                        new KioskTicketCommand.Item(
                            item.productId(),
                            item.name(),
                            item.packLabel(),
                            item.quantity(),
                            item.unitPricePaise(),
                            item.prescriptionRequired()))
                .toList();
    return ApiResponse.ok(
        toResponse(
            kioskService.createTicket(
                principal,
                new KioskTicketCommand(
                    request.walkInName(),
                    request.pickupRequest(),
                    request.paymentMethod(),
                    request.idempotencyKey(),
                    items))));
  }

  @PostMapping("/exit-pin")
  public ApiResponse<KioskResponse> verifyExitPin(
      Authentication authentication, @Valid @RequestBody ExitPinRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toResponse(kioskService.verifyExitPin(principal, request.staffExitPin())));
  }

  @PostMapping("/tickets/{id}/cancel")
  public ApiResponse<KioskResponse> cancelTicket(
      Authentication authentication, @PathVariable UUID id) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toResponse(kioskService.cancelTicket(principal, id)));
  }

  private static KioskResponse toResponse(KioskView view) {
    return new KioskResponse(
        view.planEntitled(),
        view.hasModule(),
        view.branchType(),
        view.activeBranchId(),
        view.branchName(),
        view.blockReason(),
        view.session() == null
            ? null
            : new SessionResponse(
                view.session().id(),
                view.session().status().name(),
                view.session().openedAt(),
                view.session().openedBy()),
        view.config() == null
            ? null
            : new ConfigResponse(
                view.config().displayName(),
                view.config().welcomeMessage(),
                view.config().staffExitPinSet(),
                view.config().idleResetSeconds(),
                view.config().accentTheme(),
                view.config().showPrices(),
                view.config().allowRxUpload(),
                view.config().acceptCash(),
                view.config().acceptUpi(),
                view.config().acceptCard(),
                view.config().acceptCod()),
        view.waitingTickets().stream()
            .map(
                t ->
                    new TicketResponse(
                        t.id(),
                        t.token(),
                        t.walkInName(),
                        t.pickupRequest(),
                        t.paymentMethod(),
                        t.requiresRx(),
                        t.items(),
                        t.createdAt()))
            .toList());
  }

  public record KioskResponse(
      boolean planEntitled,
      boolean hasModule,
      String branchType,
      UUID activeBranchId,
      String branchName,
      String blockReason,
      SessionResponse session,
      ConfigResponse config,
      List<TicketResponse> waitingTickets) {}

  public record SessionResponse(UUID id, String status, Instant openedAt, UUID openedBy) {}

  public record ConfigResponse(
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

  public record TicketResponse(
      UUID id,
      int token,
      String walkInName,
      String pickupRequest,
      String paymentMethod,
      boolean requiresRx,
      List<Map<String, Object>> items,
      Instant createdAt) {}

  public record CreateTicketRequest(
      @Size(max = 120) String walkInName,
      @Size(max = 500) String pickupRequest,
      @Size(max = 32) String paymentMethod,
      @Size(max = 128) String idempotencyKey,
      List<@Valid TicketItemRequest> items) {}

  public record TicketItemRequest(
      @NotNull UUID productId,
      @Size(max = 200) String name,
      @Size(max = 120) String packLabel,
      @NotNull @Min(1) @Max(999) Integer quantity,
      Long unitPricePaise,
      Boolean prescriptionRequired) {}

  public record ConfigRequest(
      @Size(max = 160) String displayName,
      @Size(max = 240) String welcomeMessage,
      @Size(max = 16) String staffExitPin,
      @Min(15) @Max(600) Integer idleResetSeconds,
      @Size(max = 16) String accentTheme,
      Boolean showPrices,
      Boolean allowRxUpload,
      Boolean acceptCash,
      Boolean acceptUpi,
      Boolean acceptCard,
      Boolean acceptCod) {}

  public record ExitPinRequest(@NotBlank @Size(max = 16) String staffExitPin) {}
}
