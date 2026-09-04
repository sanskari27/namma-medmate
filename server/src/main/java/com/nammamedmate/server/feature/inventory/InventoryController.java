package com.nammamedmate.server.feature.inventory;

import com.nammamedmate.server.application.inventory.InventoryStockService;
import com.nammamedmate.server.application.inventory.StockBalanceView;
import com.nammamedmate.server.application.inventory.StockBatchDetailView;
import com.nammamedmate.server.application.inventory.StockMovementView;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.shared.web.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
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
@RequestMapping("/api/v1/inventory")
public class InventoryController {

  private final InventoryStockService inventoryStockService;

  public InventoryController(InventoryStockService inventoryStockService) {
    this.inventoryStockService = inventoryStockService;
  }

  @GetMapping("/balances")
  public ApiResponse<BalanceListResponse> listBalances(
      Authentication authentication, @RequestParam(required = false) String q) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        new BalanceListResponse(
            inventoryStockService.listBalances(principal, q).items().stream()
                .map(InventoryController::toBalanceResponse)
                .toList()));
  }

  @GetMapping("/products/{productId}/batches")
  public ApiResponse<BatchListResponse> listBatches(
      Authentication authentication, @PathVariable UUID productId) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        new BatchListResponse(
            inventoryStockService.listBatches(principal, productId).items().stream()
                .map(InventoryController::toBatchResponse)
                .toList()));
  }

  @GetMapping("/movements")
  public ApiResponse<MovementListResponse> listMovements(
      Authentication authentication,
      @RequestParam(required = false) UUID productId,
      @RequestParam(required = false) UUID batchId) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        new MovementListResponse(
            inventoryStockService.listMovements(principal, productId, batchId).items().stream()
                .map(InventoryController::toMovementResponse)
                .toList()));
  }

  @PostMapping("/receipts")
  public ApiResponse<BalanceResponse> receive(
      Authentication authentication, @Valid @RequestBody ReceiptRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toBalanceResponse(
            inventoryStockService.receive(
                principal,
                request.productId(),
                request.batchNumber(),
                request.manufacturedOn(),
                request.expiresOn(),
                request.purchasePricePaise(),
                request.quantity(),
                request.idempotencyKey(),
                request.expectedVersion())));
  }

  @PostMapping("/issues")
  public ApiResponse<BalanceResponse> issue(
      Authentication authentication, @Valid @RequestBody IssueRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toBalanceResponse(
            inventoryStockService.issue(
                principal,
                request.productId(),
                request.batchId(),
                request.quantity(),
                request.idempotencyKey(),
                request.expectedVersion())));
  }

  private static BalanceResponse toBalanceResponse(StockBalanceView view) {
    return new BalanceResponse(
        view.balanceId(),
        view.productId(),
        view.productSku(),
        view.productName(),
        view.batchId(),
        view.batchNumber(),
        view.manufacturedOn(),
        view.expiresOn(),
        view.purchasePricePaise(),
        view.quantity(),
        view.version());
  }

  private static BatchResponse toBatchResponse(StockBatchDetailView view) {
    return new BatchResponse(
        view.batchId(),
        view.productId(),
        view.batchNumber(),
        view.manufacturedOn(),
        view.expiresOn(),
        view.purchasePricePaise(),
        view.quantity(),
        view.version(),
        view.balanceId());
  }

  private static MovementResponse toMovementResponse(StockMovementView view) {
    return new MovementResponse(
        view.id(),
        view.productId(),
        view.batchId(),
        view.type(),
        view.quantity(),
        view.balanceAfter(),
        view.purchasePricePaise(),
        view.occurredAt());
  }

  public record BalanceListResponse(List<BalanceResponse> items) {}

  public record BalanceResponse(
      UUID balanceId,
      UUID productId,
      String productSku,
      String productName,
      UUID batchId,
      String batchNumber,
      LocalDate manufacturedOn,
      LocalDate expiresOn,
      Long purchasePricePaise,
      BigDecimal quantity,
      long version) {}

  public record BatchListResponse(List<BatchResponse> items) {}

  public record BatchResponse(
      UUID batchId,
      UUID productId,
      String batchNumber,
      LocalDate manufacturedOn,
      LocalDate expiresOn,
      long purchasePricePaise,
      BigDecimal quantity,
      long version,
      UUID balanceId) {}

  public record MovementListResponse(List<MovementResponse> items) {}

  public record MovementResponse(
      UUID id,
      UUID productId,
      UUID batchId,
      String type,
      BigDecimal quantity,
      BigDecimal balanceAfter,
      Long purchasePricePaise,
      Instant occurredAt) {}

  public record ReceiptRequest(
      @NotNull UUID productId,
      @Size(max = 64) String batchNumber,
      LocalDate manufacturedOn,
      LocalDate expiresOn,
      Long purchasePricePaise,
      @NotNull @DecimalMin(value = "0.000001", inclusive = true) BigDecimal quantity,
      @NotBlank @Size(max = 128) String idempotencyKey,
      Long expectedVersion) {}

  public record IssueRequest(
      @NotNull UUID productId,
      UUID batchId,
      @NotNull @DecimalMin(value = "0.000001", inclusive = true) BigDecimal quantity,
      @NotBlank @Size(max = 128) String idempotencyKey,
      @NotNull Long expectedVersion) {}
}
