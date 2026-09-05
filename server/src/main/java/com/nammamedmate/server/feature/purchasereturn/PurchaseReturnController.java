package com.nammamedmate.server.feature.purchasereturn;

import com.nammamedmate.server.application.purchasereturn.PurchaseReturnCommand;
import com.nammamedmate.server.application.purchasereturn.PurchaseReturnListResult;
import com.nammamedmate.server.application.purchasereturn.PurchaseReturnService;
import com.nammamedmate.server.application.purchasereturn.PurchaseReturnView;
import com.nammamedmate.server.domain.PurchaseReturnOrigin;
import com.nammamedmate.server.domain.PurchaseReturnStatus;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.shared.web.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
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
@RequestMapping("/api/v1/purchase-returns")
public class PurchaseReturnController {

  private final PurchaseReturnService purchaseReturnService;

  public PurchaseReturnController(PurchaseReturnService purchaseReturnService) {
    this.purchaseReturnService = purchaseReturnService;
  }

  @GetMapping
  public ApiResponse<PurchaseReturnListResponse> list(Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    PurchaseReturnListResult result = purchaseReturnService.list(principal);
    return ApiResponse.ok(
        new PurchaseReturnListResponse(result.items().stream().map(this::toSummary).toList()));
  }

  @GetMapping("/{id}")
  public ApiResponse<PurchaseReturnResponse> get(
      Authentication authentication, @PathVariable UUID id) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toResponse(purchaseReturnService.get(principal, id)));
  }

  @PostMapping
  public ApiResponse<PurchaseReturnResponse> create(
      Authentication authentication, @Valid @RequestBody CreatePurchaseReturnRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toResponse(
            purchaseReturnService.create(
                principal,
                new PurchaseReturnCommand(
                    request.goodsReceiptId(),
                    request.idempotencyKey(),
                    request.expectedAccountVersion(),
                    request.lines().stream()
                        .map(
                            line ->
                                new PurchaseReturnCommand.Line(
                                    line.goodsReceiptLineId(), line.quantity()))
                        .toList()))));
  }

  private PurchaseReturnSummaryResponse toSummary(PurchaseReturnListResult.Summary row) {
    return new PurchaseReturnSummaryResponse(
        row.id(),
        row.debitNoteNumber(),
        row.origin(),
        row.status(),
        row.supplierId(),
        row.supplierLegalName(),
        row.amountPaise(),
        row.createdAt());
  }

  private PurchaseReturnResponse toResponse(PurchaseReturnView view) {
    return new PurchaseReturnResponse(
        view.id(),
        view.debitNoteNumber(),
        view.origin(),
        view.status(),
        view.supplierId(),
        view.supplierLegalName(),
        view.goodsReceiptId(),
        view.amountPaise(),
        view.createdAt(),
        view.lines().stream()
            .map(
                line ->
                    new PurchaseReturnLineResponse(
                        line.id(),
                        line.goodsReceiptLineId(),
                        line.productId(),
                        line.productName(),
                        line.sku(),
                        line.batchId(),
                        line.quantity(),
                        line.unitRatePaise(),
                        line.amountPaise(),
                        line.stockMovementId()))
            .toList());
  }

  public record PurchaseReturnListResponse(List<PurchaseReturnSummaryResponse> items) {}

  public record PurchaseReturnSummaryResponse(
      UUID id,
      String debitNoteNumber,
      String origin,
      String status,
      UUID supplierId,
      String supplierLegalName,
      long amountPaise,
      Instant createdAt) {}

  public record PurchaseReturnLineResponse(
      UUID id,
      UUID goodsReceiptLineId,
      UUID productId,
      String productName,
      String sku,
      UUID batchId,
      BigDecimal quantity,
      long unitRatePaise,
      long amountPaise,
      UUID stockMovementId) {}

  public record PurchaseReturnResponse(
      UUID id,
      String debitNoteNumber,
      PurchaseReturnOrigin origin,
      PurchaseReturnStatus status,
      UUID supplierId,
      String supplierLegalName,
      UUID goodsReceiptId,
      long amountPaise,
      Instant createdAt,
      List<PurchaseReturnLineResponse> lines) {}

  public record LineRequest(@NotNull UUID goodsReceiptLineId, @NotNull BigDecimal quantity) {}

  public record CreatePurchaseReturnRequest(
      @NotNull UUID goodsReceiptId,
      @NotBlank @Size(max = 128) String idempotencyKey,
      Long expectedAccountVersion,
      @NotEmpty List<@Valid LineRequest> lines) {}
}
