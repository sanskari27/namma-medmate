package com.nammamedmate.server.feature.kiosk;

import com.nammamedmate.server.application.kiosk.KioskService;
import com.nammamedmate.server.application.kiosk.KioskView;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.shared.web.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
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

  @PostMapping("/tickets")
  public ApiResponse<KioskResponse> createTicket(
      Authentication authentication, @Valid @RequestBody CreateTicketRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toResponse(
            kioskService.createTicket(principal, request.walkInName(), request.pickupRequest())));
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
        view.blockReason(),
        view.session() == null
            ? null
            : new SessionResponse(
                view.session().id(),
                view.session().status().name(),
                view.session().openedAt(),
                view.session().openedBy()),
        view.waitingTickets().stream()
            .map(
                t ->
                    new TicketResponse(
                        t.id(), t.token(), t.walkInName(), t.pickupRequest(), t.createdAt()))
            .toList());
  }

  public record KioskResponse(
      boolean planEntitled,
      boolean hasModule,
      String branchType,
      UUID activeBranchId,
      String blockReason,
      SessionResponse session,
      List<TicketResponse> waitingTickets) {}

  public record SessionResponse(UUID id, String status, Instant openedAt, UUID openedBy) {}

  public record TicketResponse(
      UUID id, int token, String walkInName, String pickupRequest, Instant createdAt) {}

  public record CreateTicketRequest(
      @Size(max = 120) String walkInName, @NotBlank @Size(max = 500) String pickupRequest) {}
}
