package com.nammamedmate.server.feature.loyalty;

import com.nammamedmate.server.application.loyalty.LoyaltyService;
import com.nammamedmate.server.application.loyalty.LoyaltyView;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.shared.web.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
@RequestMapping("/api/v1/customers")
public class LoyaltyController {

  private final LoyaltyService loyaltyService;

  public LoyaltyController(LoyaltyService loyaltyService) {
    this.loyaltyService = loyaltyService;
  }

  @GetMapping("/{id}/loyalty")
  public ApiResponse<LoyaltyResponse> get(Authentication authentication, @PathVariable UUID id) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toResponse(loyaltyService.get(principal, id)));
  }

  @PostMapping("/{id}/loyalty/adjustments")
  public ApiResponse<LoyaltyResponse> adjust(
      Authentication authentication,
      @PathVariable UUID id,
      @Valid @RequestBody AdjustRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toResponse(
            loyaltyService.adjust(
                principal,
                id,
                request.points(),
                request.reason(),
                request.idempotencyKey(),
                request.expectedVersion())));
  }

  private static LoyaltyResponse toResponse(LoyaltyView view) {
    return new LoyaltyResponse(
        view.customerId(),
        view.balancePoints(),
        view.version(),
        view.entries().stream()
            .map(
                entry ->
                    new LedgerEntryResponse(
                        entry.id(),
                        entry.type().name(),
                        entry.points(),
                        entry.deltaPoints(),
                        entry.balanceAfterPoints(),
                        entry.invoiceId(),
                        entry.salesReturnId(),
                        entry.taxablePaise(),
                        entry.reason(),
                        entry.occurredAt()))
            .toList());
  }

  public record LoyaltyResponse(
      UUID customerId, long balancePoints, long version, List<LedgerEntryResponse> entries) {}

  public record LedgerEntryResponse(
      UUID id,
      String type,
      long points,
      long deltaPoints,
      long balanceAfterPoints,
      UUID invoiceId,
      UUID salesReturnId,
      long taxablePaise,
      String reason,
      Instant occurredAt) {}

  public record AdjustRequest(
      @NotNull long points,
      @NotBlank @Size(max = 200) String reason,
      @NotBlank @Size(max = 128) String idempotencyKey,
      @NotNull Long expectedVersion) {}
}
