package com.nammamedmate.server.feature.subscription;

import com.nammamedmate.server.application.subscription.SubscriptionCurrentView;
import com.nammamedmate.server.application.subscription.SubscriptionService;
import com.nammamedmate.server.domain.PlanCatalogue;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.shared.web.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/subscriptions")
public class SubscriptionController {

  private final SubscriptionService subscriptionService;

  public SubscriptionController(SubscriptionService subscriptionService) {
    this.subscriptionService = subscriptionService;
  }

  @GetMapping("/catalogue")
  public ApiResponse<CatalogueResponse> catalogue(Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        new CatalogueResponse(
            subscriptionService.catalogue(principal).stream()
                .map(SubscriptionController::toOffer)
                .toList()));
  }

  @GetMapping("/current")
  public ApiResponse<CurrentSubscriptionResponse> current(Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toCurrent(subscriptionService.current(principal)));
  }

  @PostMapping("/upgrade")
  public ApiResponse<CurrentSubscriptionResponse> upgrade(
      Authentication authentication, @Valid @RequestBody UpgradeRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toCurrent(
            subscriptionService.upgrade(principal, request.planCode(), request.idempotencyKey())));
  }

  @PostMapping("/payment-callback")
  public ApiResponse<CurrentSubscriptionResponse> paymentCallback(
      Authentication authentication, @Valid @RequestBody PaymentCallbackRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toCurrent(
            subscriptionService.paymentCallback(
                principal, request.intentId(), request.idempotencyKey())));
  }

  private static PlanOfferResponse toOffer(PlanCatalogue.PlanOffer offer) {
    return new PlanOfferResponse(
        offer.code().name(),
        offer.pricePaiseMonthly(),
        offer.maxUsers() == Integer.MAX_VALUE ? null : offer.maxUsers(),
        offer.maxBranches(),
        offer.entitledModules().stream().map(Enum::name).toList());
  }

  private static CurrentSubscriptionResponse toCurrent(SubscriptionCurrentView view) {
    return new CurrentSubscriptionResponse(
        view.tenantId(),
        view.planCode().name(),
        view.status().name(),
        view.startedAt(),
        view.expiresAt(),
        view.branchLimitOverride(),
        view.effectiveBranchLimit(),
        view.maxUsers() == Integer.MAX_VALUE ? null : view.maxUsers(),
        view.usersUsed(),
        view.branchesUsed(),
        view.entitledModules().stream().map(Enum::name).toList());
  }

  public record CatalogueResponse(List<PlanOfferResponse> plans) {}

  public record PlanOfferResponse(
      String planCode,
      int pricePaiseMonthly,
      Integer maxUsers,
      int maxBranches,
      List<String> entitledModules) {}

  public record CurrentSubscriptionResponse(
      UUID tenantId,
      String planCode,
      String status,
      java.time.Instant startedAt,
      java.time.Instant expiresAt,
      Integer branchLimitOverride,
      int effectiveBranchLimit,
      Integer maxUsers,
      long usersUsed,
      long branchesUsed,
      List<String> entitledModules) {}

  public record UpgradeRequest(
      @NotNull com.nammamedmate.server.domain.PlanCode planCode, @NotBlank String idempotencyKey) {}

  public record PaymentCallbackRequest(@NotNull UUID intentId, @NotBlank String idempotencyKey) {}
}
