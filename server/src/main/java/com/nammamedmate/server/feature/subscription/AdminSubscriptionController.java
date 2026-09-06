package com.nammamedmate.server.feature.subscription;

import com.nammamedmate.server.application.subscription.AdminCashfreePaymentView;
import com.nammamedmate.server.application.subscription.CashfreeBillingService;
import com.nammamedmate.server.application.subscription.OverrideEventView;
import com.nammamedmate.server.application.subscription.SubscriptionCurrentView;
import com.nammamedmate.server.application.subscription.SubscriptionService;
import com.nammamedmate.server.application.subscription.TenantSubscriptionSummary;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.SubscriptionStatus;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.shared.web.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
@RequestMapping("/api/v1/admin/subscriptions")
public class AdminSubscriptionController {

  private final SubscriptionService subscriptionService;
  private final CashfreeBillingService cashfreeBillingService;

  public AdminSubscriptionController(
      SubscriptionService subscriptionService, CashfreeBillingService cashfreeBillingService) {
    this.subscriptionService = subscriptionService;
    this.cashfreeBillingService = cashfreeBillingService;
  }

  @GetMapping
  public ApiResponse<AdminSubscriptionListResponse> list(Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        new AdminSubscriptionListResponse(
            subscriptionService.listForAdmin(principal).stream()
                .map(AdminSubscriptionController::toSummary)
                .toList()));
  }

  @GetMapping("/payments")
  public ApiResponse<AdminPaymentListResponse> payments(Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        new AdminPaymentListResponse(
            cashfreeBillingService.listForAdmin(principal).stream()
                .map(AdminSubscriptionController::toPayment)
                .toList()));
  }

  @PostMapping("/{tenantId}/override")
  public ApiResponse<SubscriptionController.CurrentSubscriptionResponse> override(
      Authentication authentication,
      @PathVariable UUID tenantId,
      @Valid @RequestBody OverrideRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toCurrent(
            subscriptionService.override(
                principal,
                tenantId,
                request.planCode(),
                request.status(),
                request.expiresAt(),
                request.branchLimitOverride(),
                request.reason())));
  }

  @GetMapping("/{tenantId}/overrides")
  public ApiResponse<OverrideHistoryResponse> overrides(
      Authentication authentication, @PathVariable UUID tenantId) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        new OverrideHistoryResponse(
            subscriptionService.overrideHistory(principal, tenantId).stream()
                .map(AdminSubscriptionController::toEvent)
                .toList()));
  }

  private static AdminSubscriptionSummaryResponse toSummary(TenantSubscriptionSummary view) {
    return new AdminSubscriptionSummaryResponse(
        view.tenantId(),
        view.tenantName(),
        view.planCode().name(),
        view.status().name(),
        view.expiresAt(),
        view.branchLimitOverride(),
        view.effectiveBranchLimit(),
        view.maxUsers() == Integer.MAX_VALUE ? null : view.maxUsers(),
        view.usersUsed(),
        view.branchesUsed());
  }

  private static OverrideEventResponse toEvent(OverrideEventView view) {
    return new OverrideEventResponse(
        view.id(),
        view.tenantId(),
        view.actorUserId(),
        view.beforePlan().name(),
        view.afterPlan().name(),
        view.beforeStatus().name(),
        view.afterStatus().name(),
        view.beforeExpiresAt(),
        view.afterExpiresAt(),
        view.beforeBranchLimitOverride(),
        view.afterBranchLimitOverride(),
        view.reason(),
        view.createdAt());
  }

  private static SubscriptionController.CurrentSubscriptionResponse toCurrent(
      SubscriptionCurrentView view) {
    return new SubscriptionController.CurrentSubscriptionResponse(
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

  private static AdminPaymentResponse toPayment(AdminCashfreePaymentView view) {
    return new AdminPaymentResponse(
        view.id(),
        view.tenantId(),
        view.tenantName(),
        view.planCode().name(),
        view.amountPaise(),
        view.status().name(),
        view.errorCode(),
        view.exception(),
        view.createdAt());
  }

  public record AdminSubscriptionListResponse(List<AdminSubscriptionSummaryResponse> items) {}

  public record AdminSubscriptionSummaryResponse(
      UUID tenantId,
      String tenantName,
      String planCode,
      String status,
      Instant expiresAt,
      Integer branchLimitOverride,
      int effectiveBranchLimit,
      Integer maxUsers,
      long usersUsed,
      long branchesUsed) {}

  public record OverrideHistoryResponse(List<OverrideEventResponse> items) {}

  public record OverrideEventResponse(
      UUID id,
      UUID tenantId,
      UUID actorUserId,
      String beforePlan,
      String afterPlan,
      String beforeStatus,
      String afterStatus,
      Instant beforeExpiresAt,
      Instant afterExpiresAt,
      Integer beforeBranchLimitOverride,
      Integer afterBranchLimitOverride,
      String reason,
      Instant createdAt) {}

  public record OverrideRequest(
      @NotNull PlanCode planCode,
      @NotNull SubscriptionStatus status,
      Instant expiresAt,
      Integer branchLimitOverride,
      @NotBlank String reason) {}

  public record AdminPaymentListResponse(List<AdminPaymentResponse> items) {}

  public record AdminPaymentResponse(
      UUID id,
      UUID tenantId,
      String tenantName,
      String planCode,
      int amountPaise,
      String status,
      String errorCode,
      boolean exception,
      Instant createdAt) {}
}
