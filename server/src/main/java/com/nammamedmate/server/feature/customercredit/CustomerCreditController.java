package com.nammamedmate.server.feature.customercredit;

import com.nammamedmate.server.application.customercredit.CustomerCreditOutstandingView;
import com.nammamedmate.server.application.customercredit.CustomerCreditService;
import com.nammamedmate.server.application.customercredit.CustomerCreditView;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.shared.web.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
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
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/customers")
public class CustomerCreditController {

  private final CustomerCreditService customerCreditService;

  public CustomerCreditController(CustomerCreditService customerCreditService) {
    this.customerCreditService = customerCreditService;
  }

  @GetMapping("/credit-accounts")
  public ApiResponse<OutstandingListResponse> listOutstanding(Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    CustomerCreditOutstandingView view = customerCreditService.listOutstanding(principal);
    return ApiResponse.ok(
        new OutstandingListResponse(
            new SummaryResponse(
                view.summary().totalOutstandingPaise(),
                view.summary().outstandingAccountCount(),
                view.summary().overduePaise(),
                view.summary().overdueAccountCount(),
                view.summary().collectedThisMonthPaise(),
                view.summary().collectionRatePercent(),
                view.summary().creditGivenAllTimePaise(),
                view.summary().khataAccountCount()),
            view.aging().stream()
                .map(
                    band ->
                        new AgingBandResponse(
                            band.key(), band.label(), band.totalPaise(), band.accountCount()))
                .toList(),
            view.items().stream()
                .map(
                    item ->
                        new OutstandingItemResponse(
                            item.customerId(),
                            item.customerName(),
                            item.customerPhone(),
                            item.limitPaise(),
                            item.balancePaise(),
                            item.availablePaise(),
                            item.version(),
                            item.billCount(),
                            item.givenPaise(),
                            item.repaidPaise(),
                            item.ageDays()))
                .toList(),
            view.payments().stream()
                .map(
                    payment ->
                        new PaymentItemResponse(
                            payment.id(),
                            payment.customerId(),
                            payment.customerName(),
                            payment.amountPaise(),
                            payment.mode(),
                            payment.reference(),
                            payment.receiptLabel(),
                            payment.occurredAt()))
                .toList()));
  }

  @GetMapping("/{id}/credit")
  public ApiResponse<CreditResponse> get(Authentication authentication, @PathVariable UUID id) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toResponse(customerCreditService.get(principal, id)));
  }

  @PutMapping("/{id}/credit/limit")
  public ApiResponse<CreditResponse> setLimit(
      Authentication authentication,
      @PathVariable UUID id,
      @Valid @RequestBody SetLimitRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toResponse(
            customerCreditService.setLimit(
                principal, id, request.limitPaise(), request.expectedVersion())));
  }

  @PostMapping("/{id}/credit/charges")
  public ApiResponse<CreditResponse> charge(
      Authentication authentication,
      @PathVariable UUID id,
      @Valid @RequestBody ChargeRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toResponse(
            customerCreditService.charge(
                principal,
                id,
                request.amountPaise(),
                request.invoiceId(),
                request.idempotencyKey(),
                request.expectedVersion())));
  }

  @PostMapping("/{id}/credit/settlements")
  public ApiResponse<CreditResponse> settle(
      Authentication authentication,
      @PathVariable UUID id,
      @Valid @RequestBody SettleRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toResponse(
            customerCreditService.settle(
                principal,
                id,
                request.amountPaise(),
                request.mode(),
                request.reference(),
                request.idempotencyKey(),
                request.expectedVersion())));
  }

  private static CreditResponse toResponse(CustomerCreditView view) {
    return new CreditResponse(
        view.customerId(),
        view.limitPaise(),
        view.balancePaise(),
        view.availablePaise(),
        view.version(),
        view.entries().stream()
            .map(
                entry ->
                    new LedgerEntryResponse(
                        entry.id(),
                        entry.type().name(),
                        entry.amountPaise(),
                        entry.balanceAfterPaise(),
                        entry.invoiceId(),
                        entry.settlementMode(),
                        entry.settlementReference(),
                        entry.occurredAt()))
            .toList());
  }

  public record OutstandingListResponse(
      SummaryResponse summary,
      List<AgingBandResponse> aging,
      List<OutstandingItemResponse> items,
      List<PaymentItemResponse> payments) {}

  public record SummaryResponse(
      long totalOutstandingPaise,
      int outstandingAccountCount,
      long overduePaise,
      int overdueAccountCount,
      long collectedThisMonthPaise,
      int collectionRatePercent,
      long creditGivenAllTimePaise,
      int khataAccountCount) {}

  public record AgingBandResponse(String key, String label, long totalPaise, int accountCount) {}

  public record OutstandingItemResponse(
      UUID customerId,
      String customerName,
      String customerPhone,
      long limitPaise,
      long balancePaise,
      long availablePaise,
      long version,
      int billCount,
      long givenPaise,
      long repaidPaise,
      int ageDays) {}

  public record PaymentItemResponse(
      UUID id,
      UUID customerId,
      String customerName,
      long amountPaise,
      String mode,
      String reference,
      String receiptLabel,
      Instant occurredAt) {}

  public record CreditResponse(
      UUID customerId,
      long limitPaise,
      long balancePaise,
      long availablePaise,
      long version,
      List<LedgerEntryResponse> entries) {}

  public record LedgerEntryResponse(
      UUID id,
      String type,
      long amountPaise,
      long balanceAfterPaise,
      UUID invoiceId,
      String settlementMode,
      String settlementReference,
      Instant occurredAt) {}

  public record SetLimitRequest(@Min(0) long limitPaise, @NotNull Long expectedVersion) {}

  public record ChargeRequest(
      @Min(1) long amountPaise,
      UUID invoiceId,
      @NotBlank @Size(max = 128) String idempotencyKey,
      @NotNull Long expectedVersion) {}

  public record SettleRequest(
      @Min(1) long amountPaise,
      @NotBlank @Size(max = 64) String mode,
      @Size(max = 200) String reference,
      @NotBlank @Size(max = 128) String idempotencyKey,
      @NotNull Long expectedVersion) {}
}
