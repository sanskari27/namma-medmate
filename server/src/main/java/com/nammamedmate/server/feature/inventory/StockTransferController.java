package com.nammamedmate.server.feature.inventory;

import com.nammamedmate.server.application.inventory.CreateStockTransferCommand;
import com.nammamedmate.server.application.inventory.StockTransferLineView;
import com.nammamedmate.server.application.inventory.StockTransferService;
import com.nammamedmate.server.application.inventory.StockTransferView;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.shared.web.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/stock-transfers")
public class StockTransferController {

  private final StockTransferService stockTransferService;

  public StockTransferController(StockTransferService stockTransferService) {
    this.stockTransferService = stockTransferService;
  }

  @GetMapping
  public ApiResponse<TransferListResponse> list(
      Authentication authentication, @RequestParam(required = false) String scope) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        new TransferListResponse(
            stockTransferService.list(principal, scope).items().stream()
                .map(StockTransferController::toResponse)
                .toList()));
  }

  @GetMapping("/{id}")
  public ApiResponse<TransferResponse> get(Authentication authentication, @PathVariable UUID id) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toResponse(stockTransferService.get(principal, id)));
  }

  @PostMapping
  public ApiResponse<TransferResponse> create(
      Authentication authentication, @Valid @RequestBody CreateTransferRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toResponse(
            stockTransferService.create(
                principal,
                new CreateStockTransferCommand(
                    request.direction(),
                    request.counterpartyBranchId(),
                    request.lines().stream()
                        .map(
                            line ->
                                new CreateStockTransferCommand.Line(
                                    line.productId(), line.batchId(), line.quantity()))
                        .toList(),
                    request.idempotencyKey()))));
  }

  @PostMapping("/{id}/dispatch")
  public ApiResponse<TransferResponse> dispatch(
      Authentication authentication, @PathVariable UUID id) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toResponse(stockTransferService.dispatch(principal, id)));
  }

  @PostMapping("/{id}/confirm")
  public ApiResponse<TransferResponse> confirm(
      Authentication authentication, @PathVariable UUID id) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toResponse(stockTransferService.confirm(principal, id)));
  }

  @PostMapping("/{id}/reject")
  public ApiResponse<TransferResponse> reject(
      Authentication authentication, @PathVariable UUID id) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toResponse(stockTransferService.reject(principal, id)));
  }

  @PostMapping("/{id}/cancel")
  public ApiResponse<TransferResponse> cancel(
      Authentication authentication, @PathVariable UUID id) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toResponse(stockTransferService.cancel(principal, id)));
  }

  private static TransferResponse toResponse(StockTransferView view) {
    return new TransferResponse(
        view.id(),
        view.fromBranchId(),
        view.toBranchId(),
        view.direction(),
        view.status(),
        view.lines().stream().map(StockTransferController::toLine).toList(),
        view.version(),
        view.createdAt(),
        view.updatedAt());
  }

  private static TransferLineResponse toLine(StockTransferLineView view) {
    return new TransferLineResponse(
        view.id(),
        view.productId(),
        view.productSku(),
        view.productName(),
        view.batchId(),
        view.quantity());
  }

  public record TransferListResponse(List<TransferResponse> items) {}

  public record TransferResponse(
      UUID id,
      UUID fromBranchId,
      UUID toBranchId,
      String direction,
      String status,
      List<TransferLineResponse> lines,
      long version,
      Instant createdAt,
      Instant updatedAt) {}

  public record TransferLineResponse(
      UUID id,
      UUID productId,
      String productSku,
      String productName,
      UUID batchId,
      BigDecimal quantity) {}

  public record CreateTransferRequest(
      @NotBlank @Size(max = 16) String direction,
      @NotNull UUID counterpartyBranchId,
      @NotEmpty List<@Valid TransferLineRequest> lines,
      @NotBlank @Size(max = 128) String idempotencyKey) {}

  public record TransferLineRequest(
      @NotNull UUID productId,
      UUID batchId,
      @NotNull @DecimalMin(value = "0.000001", inclusive = true) BigDecimal quantity) {}
}
