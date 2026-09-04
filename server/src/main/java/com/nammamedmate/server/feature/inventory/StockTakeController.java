package com.nammamedmate.server.feature.inventory;

import com.nammamedmate.server.application.inventory.CreateStockTakeCommand;
import com.nammamedmate.server.application.inventory.SaveStockTakeCountsCommand;
import com.nammamedmate.server.application.inventory.StockTakeLineView;
import com.nammamedmate.server.application.inventory.StockTakeService;
import com.nammamedmate.server.application.inventory.StockTakeView;
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
@RequestMapping("/api/v1/stock-takes")
public class StockTakeController {

  private final StockTakeService stockTakeService;

  public StockTakeController(StockTakeService stockTakeService) {
    this.stockTakeService = stockTakeService;
  }

  @GetMapping
  public ApiResponse<StockTakeListResponse> list(
      Authentication authentication, @RequestParam(required = false) String scope) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        new StockTakeListResponse(
            stockTakeService.list(principal, scope).items().stream()
                .map(StockTakeController::toResponse)
                .toList()));
  }

  @GetMapping("/{id}")
  public ApiResponse<StockTakeResponse> get(Authentication authentication, @PathVariable UUID id) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toResponse(stockTakeService.get(principal, id)));
  }

  @PostMapping
  public ApiResponse<StockTakeResponse> start(
      Authentication authentication, @Valid @RequestBody StartStockTakeRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toResponse(
            stockTakeService.start(
                principal, new CreateStockTakeCommand(request.idempotencyKey()))));
  }

  @PostMapping("/{id}/counts")
  public ApiResponse<StockTakeResponse> saveCounts(
      Authentication authentication,
      @PathVariable UUID id,
      @Valid @RequestBody SaveCountsRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toResponse(
            stockTakeService.saveCounts(
                principal,
                id,
                new SaveStockTakeCountsCommand(
                    request.lines().stream()
                        .map(
                            line ->
                                new SaveStockTakeCountsCommand.Line(
                                    line.lineId(), line.countedQuantity()))
                        .toList()))));
  }

  @PostMapping("/{id}/post")
  public ApiResponse<StockTakeResponse> post(Authentication authentication, @PathVariable UUID id) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toResponse(stockTakeService.post(principal, id)));
  }

  @PostMapping("/{id}/cancel")
  public ApiResponse<StockTakeResponse> cancel(
      Authentication authentication, @PathVariable UUID id) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toResponse(stockTakeService.cancel(principal, id)));
  }

  private static StockTakeResponse toResponse(StockTakeView view) {
    return new StockTakeResponse(
        view.id(),
        view.branchId(),
        view.status(),
        view.startedByUserId(),
        view.postedByUserId(),
        view.cancelledByUserId(),
        view.version(),
        view.createdAt(),
        view.updatedAt(),
        view.postedAt(),
        view.lines().stream().map(StockTakeController::toLine).toList());
  }

  private static StockTakeLineResponse toLine(StockTakeLineView view) {
    return new StockTakeLineResponse(
        view.id(),
        view.productId(),
        view.productSku(),
        view.productName(),
        view.batchId(),
        view.batchNumber(),
        view.expiresOn(),
        view.expectedQuantity(),
        view.countedQuantity(),
        view.countedAt(),
        view.countedByUserId(),
        view.adjustmentId(),
        view.varianceQuantity(),
        view.direction());
  }

  public record StockTakeListResponse(List<StockTakeResponse> items) {}

  public record StockTakeResponse(
      UUID id,
      UUID branchId,
      String status,
      UUID startedByUserId,
      UUID postedByUserId,
      UUID cancelledByUserId,
      int version,
      Instant createdAt,
      Instant updatedAt,
      Instant postedAt,
      List<StockTakeLineResponse> lines) {}

  public record StockTakeLineResponse(
      UUID id,
      UUID productId,
      String productSku,
      String productName,
      UUID batchId,
      String batchNumber,
      LocalDate expiresOn,
      BigDecimal expectedQuantity,
      BigDecimal countedQuantity,
      Instant countedAt,
      UUID countedByUserId,
      UUID adjustmentId,
      BigDecimal varianceQuantity,
      String direction) {}

  public record StartStockTakeRequest(@NotBlank @Size(max = 128) String idempotencyKey) {}

  public record SaveCountsRequest(@NotNull List<@Valid CountLineRequest> lines) {}

  public record CountLineRequest(
      @NotNull UUID lineId,
      @NotNull @DecimalMin(value = "0", inclusive = true) BigDecimal countedQuantity) {}
}
