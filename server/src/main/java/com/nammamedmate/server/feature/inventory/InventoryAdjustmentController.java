package com.nammamedmate.server.feature.inventory;

import com.nammamedmate.server.application.inventory.CreateStockAdjustmentCommand;
import com.nammamedmate.server.application.inventory.InventoryAdjustmentService;
import com.nammamedmate.server.application.inventory.StockAdjustmentView;
import com.nammamedmate.server.domain.ApprovalDecisionOutcome;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.shared.web.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/inventory/adjustments")
public class InventoryAdjustmentController {

  private final InventoryAdjustmentService inventoryAdjustmentService;

  public InventoryAdjustmentController(InventoryAdjustmentService inventoryAdjustmentService) {
    this.inventoryAdjustmentService = inventoryAdjustmentService;
  }

  @GetMapping
  public ApiResponse<AdjustmentListResponse> list(
      Authentication authentication, @RequestParam(required = false) String scope) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        new AdjustmentListResponse(
            inventoryAdjustmentService.list(principal, scope).items().stream()
                .map(InventoryAdjustmentController::toResponse)
                .toList()));
  }

  @GetMapping("/{id}")
  public ApiResponse<AdjustmentResponse> get(Authentication authentication, @PathVariable UUID id) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toResponse(inventoryAdjustmentService.get(principal, id)));
  }

  @PostMapping
  public ApiResponse<AdjustmentResponse> create(
      Authentication authentication, @Valid @RequestBody CreateAdjustmentRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toResponse(
            inventoryAdjustmentService.create(
                principal,
                new CreateStockAdjustmentCommand(
                    request.productId(),
                    request.batchId(),
                    request.reason(),
                    request.quantity(),
                    request.direction(),
                    request.idempotencyKey()))));
  }

  @PostMapping("/{id}/decide")
  public ApiResponse<AdjustmentResponse> decide(
      Authentication authentication,
      @PathVariable UUID id,
      @Valid @RequestBody DecideAdjustmentRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toResponse(
            inventoryAdjustmentService.decide(
                principal,
                id,
                ApprovalDecisionOutcome.valueOf(request.outcome()),
                request.expectedVersion(),
                request.note())));
  }

  private static AdjustmentResponse toResponse(StockAdjustmentView view) {
    return new AdjustmentResponse(
        view.id(),
        view.productId(),
        view.productSku(),
        view.productName(),
        view.batchId(),
        view.batchNumber(),
        view.reason().name(),
        view.quantity(),
        view.direction().name(),
        view.status().name(),
        view.requesterUserId(),
        view.approverUserId(),
        view.approvalRequestId(),
        view.version(),
        view.createdAt(),
        view.decidedAt());
  }

  public record AdjustmentListResponse(List<AdjustmentResponse> items) {}

  public record AdjustmentResponse(
      UUID id,
      UUID productId,
      String productSku,
      String productName,
      UUID batchId,
      String batchNumber,
      String reason,
      BigDecimal quantity,
      String direction,
      String status,
      UUID requesterUserId,
      UUID approverUserId,
      UUID approvalRequestId,
      int version,
      Instant createdAt,
      Instant decidedAt) {}

  public record CreateAdjustmentRequest(
      @NotNull UUID productId,
      UUID batchId,
      @NotBlank @Size(max = 32) String reason,
      @NotNull @DecimalMin(value = "0.000001", inclusive = true) BigDecimal quantity,
      @Size(max = 8) String direction,
      @NotBlank @Size(max = 128) String idempotencyKey) {}

  public record DecideAdjustmentRequest(
      @NotBlank String outcome, @NotNull Integer expectedVersion, String note) {}
}
