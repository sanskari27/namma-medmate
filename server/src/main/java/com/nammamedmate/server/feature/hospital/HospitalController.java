package com.nammamedmate.server.feature.hospital;

import com.nammamedmate.server.application.hospital.HospitalAccountCommand;
import com.nammamedmate.server.application.hospital.HospitalAccountView;
import com.nammamedmate.server.application.hospital.HospitalPriceListCommand;
import com.nammamedmate.server.application.hospital.HospitalPriceListUpdateResult;
import com.nammamedmate.server.application.hospital.HospitalPriceListView;
import com.nammamedmate.server.application.hospital.HospitalPriceRuleCommand;
import com.nammamedmate.server.application.hospital.HospitalService;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.shared.web.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/hospital")
public class HospitalController {

  private final HospitalService hospitalService;

  public HospitalController(HospitalService hospitalService) {
    this.hospitalService = hospitalService;
  }

  @GetMapping("/account")
  public ApiResponse<AccountResponse> getAccount(Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toAccountResponse(hospitalService.getAccount(principal)));
  }

  @PutMapping("/account")
  public ApiResponse<AccountResponse> upsertAccount(
      Authentication authentication, @Valid @RequestBody AccountRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toAccountResponse(
            hospitalService.upsertAccount(
                principal,
                new HospitalAccountCommand(
                    request.institutionName(),
                    request.gstin(),
                    request.storesContact(),
                    request.billingPhone(),
                    request.billingEmail(),
                    request.creditTerms(),
                    request.creditLimitPaise(),
                    request.expectedVersion()))));
  }

  @GetMapping("/prices")
  public ApiResponse<PriceListResponse> getPrices(Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toPriceListResponse(hospitalService.getPrices(principal)));
  }

  @PutMapping("/prices")
  public ApiResponse<PriceUpdateResponse> updatePrices(
      Authentication authentication, @Valid @RequestBody PriceListRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    HospitalPriceListUpdateResult result =
        hospitalService.updatePrices(
            principal,
            new HospitalPriceListCommand(
                request.uniformDiscountBps(),
                request.productRules() == null
                    ? List.of()
                    : request.productRules().stream()
                        .map(
                            row ->
                                new HospitalPriceRuleCommand(
                                    row.productId(), row.ruleType(), row.value()))
                        .toList(),
                request.expectedVersion()));
    return ApiResponse.ok(
        new PriceUpdateResponse(
            result.status(), toPriceListResponse(result.priceList()), result.approvalRequestId()));
  }

  private static AccountResponse toAccountResponse(HospitalAccountView view) {
    return new AccountResponse(
        view.configured(),
        view.id(),
        view.institutionName(),
        view.gstin(),
        view.storesContact(),
        view.billingPhone(),
        view.billingEmail(),
        view.creditTerms() == null ? null : view.creditTerms().name(),
        view.creditLimitPaise(),
        view.balancePaise(),
        view.availableCreditPaise(),
        view.uniformDiscountBps(),
        view.pendingPriceListApprovalRequestId(),
        view.version());
  }

  private static PriceListResponse toPriceListResponse(HospitalPriceListView view) {
    return new PriceListResponse(
        view.uniformDiscountBps(),
        view.pendingApprovalRequestId(),
        view.items().stream()
            .map(
                item ->
                    new ProductPriceResponse(
                        item.productId(),
                        item.productName(),
                        item.sku(),
                        item.mrpPaise(),
                        item.creditPricePaise(),
                        item.effectiveDiscountBps(),
                        item.ruleType() == null ? null : item.ruleType().name(),
                        item.ruleValue()))
            .toList());
  }

  public record AccountRequest(
      @NotBlank @Size(max = 200) String institutionName,
      @Size(max = 20) String gstin,
      @Size(max = 200) String storesContact,
      @Size(max = 32) String billingPhone,
      @Size(max = 200) String billingEmail,
      @NotBlank String creditTerms,
      @NotNull Long creditLimitPaise,
      Long expectedVersion) {}

  public record AccountResponse(
      boolean configured,
      UUID id,
      String institutionName,
      String gstin,
      String storesContact,
      String billingPhone,
      String billingEmail,
      String creditTerms,
      long creditLimitPaise,
      long balancePaise,
      long availableCreditPaise,
      int uniformDiscountBps,
      UUID pendingPriceListApprovalRequestId,
      long version) {}

  public record PriceListRequest(
      @NotNull Integer uniformDiscountBps,
      List<ProductRuleRequest> productRules,
      Long expectedVersion) {}

  public record ProductRuleRequest(@NotNull UUID productId, String ruleType, Integer value) {}

  public record PriceListResponse(
      int uniformDiscountBps, UUID pendingApprovalRequestId, List<ProductPriceResponse> items) {}

  public record ProductPriceResponse(
      UUID productId,
      String productName,
      String sku,
      long mrpPaise,
      long creditPricePaise,
      int effectiveDiscountBps,
      String ruleType,
      Integer ruleValue) {}

  public record PriceUpdateResponse(
      String status, PriceListResponse priceList, UUID approvalRequestId) {}
}
