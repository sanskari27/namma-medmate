package com.nammamedmate.server.feature.inventory;

import com.nammamedmate.server.application.inventory.BranchStockLevelView;
import com.nammamedmate.server.application.inventory.InventoryAlertsView;
import com.nammamedmate.server.application.inventory.InventorySettingsView;
import com.nammamedmate.server.application.inventory.InventoryStockService;
import com.nammamedmate.server.application.inventory.StockBalanceView;
import com.nammamedmate.server.application.inventory.StockBatchDetailView;
import com.nammamedmate.server.application.inventory.StockMovementView;
import com.nammamedmate.server.application.inventory.StockValuationView;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.shared.web.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
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

  @GetMapping("/settings")
  public ApiResponse<SettingsResponse> getSettings(Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    InventorySettingsView view = inventoryStockService.getSettings(principal);
    return ApiResponse.ok(new SettingsResponse(view.expiryWarnDays()));
  }

  @PutMapping("/settings")
  public ApiResponse<SettingsResponse> updateSettings(
      Authentication authentication, @Valid @RequestBody SettingsRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    InventorySettingsView view =
        inventoryStockService.updateSettings(principal, request.expiryWarnDays());
    return ApiResponse.ok(new SettingsResponse(view.expiryWarnDays()));
  }

  @GetMapping("/products/{productId}/stock-levels")
  public ApiResponse<StockLevelsResponse> getStockLevels(
      Authentication authentication, @PathVariable UUID productId) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    BranchStockLevelView view = inventoryStockService.getStockLevels(principal, productId);
    return ApiResponse.ok(
        new StockLevelsResponse(view.reorderLevel(), view.reorderQuantity(), view.minimumStock()));
  }

  @PutMapping("/products/{productId}/stock-levels")
  public ApiResponse<StockLevelsResponse> upsertStockLevels(
      Authentication authentication,
      @PathVariable UUID productId,
      @Valid @RequestBody StockLevelsRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    BranchStockLevelView view =
        inventoryStockService.upsertStockLevels(
            principal,
            productId,
            request.reorderLevel(),
            request.reorderQuantity(),
            request.minimumStock());
    return ApiResponse.ok(
        new StockLevelsResponse(view.reorderLevel(), view.reorderQuantity(), view.minimumStock()));
  }

  @GetMapping(value = "/reorder-report", produces = "text/csv")
  public ResponseEntity<String> reorderReport(Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    String csv = inventoryStockService.reorderReportCsv(principal);
    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"reorder-report.csv\"")
        .contentType(new MediaType("text", "csv"))
        .body(csv);
  }

  @GetMapping("/valuation")
  public ApiResponse<ValuationResponse> valuation(Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    StockValuationView view = inventoryStockService.valuation(principal);
    return ApiResponse.ok(new ValuationResponse(view.totalPurchaseValuePaise()));
  }

  @GetMapping("/alerts")
  public ApiResponse<AlertsResponse> alerts(Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    InventoryAlertsView view = inventoryStockService.alerts(principal);
    return ApiResponse.ok(
        new AlertsResponse(
            view.lowStock().stream()
                .map(
                    item ->
                        new LowStockResponse(
                            item.productId(),
                            item.productSku(),
                            item.productName(),
                            item.onHand(),
                            item.reorderLevel(),
                            item.minimumStock(),
                            item.otherBranches().stream()
                                .map(
                                    o ->
                                        new OtherBranchResponse(
                                            o.branchId(), o.branchName(), o.quantity()))
                                .toList()))
                .toList(),
            view.nearExpiry().stream()
                .map(
                    item ->
                        new NearExpiryResponse(
                            item.productId(),
                            item.productSku(),
                            item.productName(),
                            item.batchId(),
                            item.batchNumber(),
                            item.expiresOn(),
                            item.quantity()))
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
        view.version(),
        view.nearExpiry());
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
        view.balanceId(),
        view.suggestedFefo(),
        view.nearExpiry(),
        view.expired());
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
      long version,
      boolean nearExpiry) {}

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
      UUID balanceId,
      boolean suggestedFefo,
      boolean nearExpiry,
      boolean expired) {}

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

  public record SettingsResponse(int expiryWarnDays) {}

  public record SettingsRequest(@NotNull @Min(0) Integer expiryWarnDays) {}

  public record StockLevelsResponse(
      Integer reorderLevel, Integer reorderQuantity, Integer minimumStock) {}

  public record StockLevelsRequest(
      @Min(0) Integer reorderLevel,
      @Min(0) Integer reorderQuantity,
      @Min(0) Integer minimumStock) {}

  public record ValuationResponse(long totalPurchaseValuePaise) {}

  public record AlertsResponse(
      List<LowStockResponse> lowStock, List<NearExpiryResponse> nearExpiry) {}

  public record LowStockResponse(
      UUID productId,
      String productSku,
      String productName,
      BigDecimal onHand,
      Integer reorderLevel,
      Integer minimumStock,
      List<OtherBranchResponse> otherBranches) {}

  public record OtherBranchResponse(UUID branchId, String branchName, BigDecimal quantity) {}

  public record NearExpiryResponse(
      UUID productId,
      String productSku,
      String productName,
      UUID batchId,
      String batchNumber,
      LocalDate expiresOn,
      BigDecimal quantity) {}

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
