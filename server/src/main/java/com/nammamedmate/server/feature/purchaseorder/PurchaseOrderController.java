package com.nammamedmate.server.feature.purchaseorder;

import com.nammamedmate.server.application.purchaseorder.CreatePurchaseOrderCommand;
import com.nammamedmate.server.application.purchaseorder.PurchaseOrderService;
import com.nammamedmate.server.application.purchaseorder.PurchaseOrderVersionView;
import com.nammamedmate.server.application.purchaseorder.PurchaseOrderView;
import com.nammamedmate.server.application.purchaseorder.UpdatePurchaseOrderCommand;
import com.nammamedmate.server.domain.PurchaseOrderStatus;
import com.nammamedmate.server.domain.SupplierPaymentTerms;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.shared.web.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/purchase-orders")
public class PurchaseOrderController {

  private final PurchaseOrderService purchaseOrderService;

  public PurchaseOrderController(PurchaseOrderService purchaseOrderService) {
    this.purchaseOrderService = purchaseOrderService;
  }

  @GetMapping
  public ApiResponse<PurchaseOrderListResponse> list(Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        new PurchaseOrderListResponse(
            purchaseOrderService.list(principal).items().stream().map(this::toResponse).toList()));
  }

  @GetMapping("/{id}")
  public ApiResponse<PurchaseOrderResponse> get(
      Authentication authentication, @PathVariable UUID id) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toResponse(purchaseOrderService.get(principal, id)));
  }

  @GetMapping("/{id}/versions")
  public ApiResponse<PurchaseOrderVersionListResponse> versions(
      Authentication authentication, @PathVariable UUID id) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        new PurchaseOrderVersionListResponse(
            purchaseOrderService.versions(principal, id).items().stream()
                .map(this::toVersionResponse)
                .toList()));
  }

  @PostMapping
  public ApiResponse<PurchaseOrderResponse> create(
      Authentication authentication, @Valid @RequestBody CreatePurchaseOrderRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toResponse(
            purchaseOrderService.create(
                principal,
                new CreatePurchaseOrderCommand(
                    request.supplierId(),
                    request.expectedDeliveryDate(),
                    request.paymentTerms(),
                    request.notes(),
                    request.idempotencyKey(),
                    request.lines().stream()
                        .map(
                            line ->
                                new CreatePurchaseOrderCommand.Line(
                                    line.productId(), line.quantity(), line.unitRatePaise()))
                        .toList()))));
  }

  @PatchMapping("/{id}")
  public ApiResponse<PurchaseOrderResponse> update(
      Authentication authentication,
      @PathVariable UUID id,
      @Valid @RequestBody UpdatePurchaseOrderRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toResponse(
            purchaseOrderService.update(
                principal,
                id,
                new UpdatePurchaseOrderCommand(
                    request.supplierId(),
                    request.expectedVersion(),
                    request.expectedDeliveryDate(),
                    request.paymentTerms(),
                    request.notes(),
                    request.lines().stream()
                        .map(
                            line ->
                                new CreatePurchaseOrderCommand.Line(
                                    line.productId(), line.quantity(), line.unitRatePaise()))
                        .toList()))));
  }

  @PostMapping("/{id}/issue")
  public ApiResponse<PurchaseOrderResponse> issue(
      Authentication authentication,
      @PathVariable UUID id,
      @Valid @RequestBody TransitionPurchaseOrderRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toResponse(purchaseOrderService.issue(principal, id, request.expectedVersion())));
  }

  @PostMapping("/{id}/close")
  public ApiResponse<PurchaseOrderResponse> close(
      Authentication authentication,
      @PathVariable UUID id,
      @Valid @RequestBody TransitionPurchaseOrderRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toResponse(purchaseOrderService.close(principal, id, request.expectedVersion())));
  }

  @PostMapping("/{id}/cancel")
  public ApiResponse<PurchaseOrderResponse> cancel(
      Authentication authentication,
      @PathVariable UUID id,
      @Valid @RequestBody TransitionPurchaseOrderRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toResponse(purchaseOrderService.cancel(principal, id, request.expectedVersion())));
  }

  private PurchaseOrderResponse toResponse(PurchaseOrderView view) {
    return new PurchaseOrderResponse(
        view.id(),
        view.tenantId(),
        view.branchId(),
        view.supplierId(),
        view.supplierLegalName(),
        view.poNumber(),
        view.status(),
        view.expectedDeliveryDate(),
        view.paymentTerms(),
        view.notes(),
        view.version(),
        view.subtotalPaise(),
        view.taxPaise(),
        view.totalPaise(),
        view.lines().stream()
            .map(
                line ->
                    new PurchaseOrderLineResponse(
                        line.id(),
                        line.productId(),
                        line.productName(),
                        line.sku(),
                        line.quantity(),
                        line.unitRatePaise(),
                        line.gstRate(),
                        line.lineSubtotalPaise(),
                        line.lineTaxPaise(),
                        line.lineTotalPaise()))
            .toList(),
        view.createdAt(),
        view.updatedAt());
  }

  private PurchaseOrderVersionResponse toVersionResponse(PurchaseOrderVersionView view) {
    return new PurchaseOrderVersionResponse(
        view.version(),
        view.createdAt(),
        view.changedByUserId(),
        view.status(),
        view.totalPaise(),
        view.snapshot());
  }

  public record PurchaseOrderListResponse(List<PurchaseOrderResponse> items) {}

  public record PurchaseOrderVersionListResponse(List<PurchaseOrderVersionResponse> items) {}

  public record PurchaseOrderLineResponse(
      UUID id,
      UUID productId,
      String productName,
      String sku,
      BigDecimal quantity,
      long unitRatePaise,
      BigDecimal gstRate,
      long lineSubtotalPaise,
      long lineTaxPaise,
      long lineTotalPaise) {}

  public record PurchaseOrderResponse(
      UUID id,
      UUID tenantId,
      UUID branchId,
      UUID supplierId,
      String supplierLegalName,
      String poNumber,
      PurchaseOrderStatus status,
      LocalDate expectedDeliveryDate,
      SupplierPaymentTerms paymentTerms,
      String notes,
      int version,
      long subtotalPaise,
      long taxPaise,
      long totalPaise,
      List<PurchaseOrderLineResponse> lines,
      Instant createdAt,
      Instant updatedAt) {}

  public record PurchaseOrderVersionResponse(
      int version,
      Instant createdAt,
      UUID changedByUserId,
      PurchaseOrderStatus status,
      long totalPaise,
      Map<String, Object> snapshot) {}

  public record LineRequest(
      @NotNull UUID productId, @NotNull BigDecimal quantity, @NotNull Long unitRatePaise) {}

  public record CreatePurchaseOrderRequest(
      @NotNull UUID supplierId,
      LocalDate expectedDeliveryDate,
      SupplierPaymentTerms paymentTerms,
      String notes,
      @NotBlank @Size(max = 128) String idempotencyKey,
      @NotEmpty List<@Valid LineRequest> lines) {}

  public record UpdatePurchaseOrderRequest(
      UUID supplierId,
      @NotNull Integer expectedVersion,
      LocalDate expectedDeliveryDate,
      SupplierPaymentTerms paymentTerms,
      String notes,
      @NotEmpty List<@Valid LineRequest> lines) {}

  public record TransitionPurchaseOrderRequest(@NotNull Integer expectedVersion) {}
}
