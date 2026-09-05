package com.nammamedmate.server.feature.sales;

import com.nammamedmate.server.application.salesreturn.SalesReturnCommand;
import com.nammamedmate.server.application.salesreturn.SalesReturnListResult;
import com.nammamedmate.server.application.salesreturn.SalesReturnService;
import com.nammamedmate.server.application.salesreturn.SalesReturnView;
import com.nammamedmate.server.domain.SalesReturnDecision;
import com.nammamedmate.server.domain.SalesReturnRefundMode;
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
@RequestMapping("/api/v1/sales/returns")
public class SalesReturnController {

  private final SalesReturnService salesReturnService;

  public SalesReturnController(SalesReturnService salesReturnService) {
    this.salesReturnService = salesReturnService;
  }

  @GetMapping
  public ApiResponse<SalesReturnListResponse> list(Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    SalesReturnListResult result = salesReturnService.list(principal);
    return ApiResponse.ok(
        new SalesReturnListResponse(result.items().stream().map(this::toSummary).toList()));
  }

  @GetMapping("/{id}")
  public ApiResponse<SalesReturnResponse> get(
      Authentication authentication, @PathVariable UUID id) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toResponse(salesReturnService.get(principal, id)));
  }

  @PostMapping("/preview")
  public ApiResponse<SalesReturnResponse> preview(
      Authentication authentication, @Valid @RequestBody PreviewSalesReturnRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toResponse(salesReturnService.preview(principal, toCommand(request))));
  }

  @PostMapping
  public ApiResponse<SalesReturnResponse> create(
      Authentication authentication, @Valid @RequestBody CreateSalesReturnRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toResponse(salesReturnService.create(principal, toCommand(request))));
  }

  private SalesReturnCommand toCommand(PreviewSalesReturnRequest request) {
    return new SalesReturnCommand(
        request.salesInvoiceId(),
        request.reason(),
        request.decision(),
        request.refundMode(),
        request.idempotencyKey(),
        request.lines().stream()
            .map(line -> new SalesReturnCommand.Line(line.salesInvoiceLineId(), line.quantity()))
            .toList());
  }

  private SalesReturnCommand toCommand(CreateSalesReturnRequest request) {
    return new SalesReturnCommand(
        request.salesInvoiceId(),
        request.reason(),
        request.decision(),
        request.refundMode(),
        request.idempotencyKey(),
        request.lines().stream()
            .map(line -> new SalesReturnCommand.Line(line.salesInvoiceLineId(), line.quantity()))
            .toList());
  }

  private SalesReturnSummaryResponse toSummary(SalesReturnListResult.Summary row) {
    return new SalesReturnSummaryResponse(
        row.id(),
        row.salesInvoiceId(),
        row.invoiceNumber(),
        row.customerId(),
        row.reason(),
        row.decision(),
        row.refundMode(),
        row.refundTotalPaise(),
        row.createdAt());
  }

  private SalesReturnResponse toResponse(SalesReturnView view) {
    return new SalesReturnResponse(
        view.id(),
        view.salesInvoiceId(),
        view.invoiceNumber(),
        view.customerId(),
        view.reason(),
        view.decision(),
        view.refundMode(),
        view.refundTotalPaise(),
        view.cashRefundPaise(),
        view.creditNotePaise(),
        view.createdAt(),
        view.lines().stream()
            .map(
                line ->
                    new SalesReturnLineResponse(
                        line.id(),
                        line.salesInvoiceLineId(),
                        line.productId(),
                        line.productName(),
                        line.sku(),
                        line.batchId(),
                        line.batchNumber(),
                        line.quantity(),
                        line.lineTotalPaise(),
                        line.refundAmountPaise(),
                        line.stockMovementId()))
            .toList());
  }

  public record SalesReturnListResponse(List<SalesReturnSummaryResponse> items) {}

  public record SalesReturnSummaryResponse(
      UUID id,
      UUID salesInvoiceId,
      String invoiceNumber,
      UUID customerId,
      String reason,
      SalesReturnDecision decision,
      SalesReturnRefundMode refundMode,
      long refundTotalPaise,
      Instant createdAt) {}

  public record SalesReturnLineResponse(
      UUID id,
      UUID salesInvoiceLineId,
      UUID productId,
      String productName,
      String sku,
      UUID batchId,
      String batchNumber,
      BigDecimal quantity,
      long lineTotalPaise,
      long refundAmountPaise,
      UUID stockMovementId) {}

  public record SalesReturnResponse(
      UUID id,
      UUID salesInvoiceId,
      String invoiceNumber,
      UUID customerId,
      String reason,
      SalesReturnDecision decision,
      SalesReturnRefundMode refundMode,
      long refundTotalPaise,
      long cashRefundPaise,
      long creditNotePaise,
      Instant createdAt,
      List<SalesReturnLineResponse> lines) {}

  public record LineRequest(@NotNull UUID salesInvoiceLineId, @NotNull BigDecimal quantity) {}

  public record PreviewSalesReturnRequest(
      @NotNull UUID salesInvoiceId,
      @NotBlank @Size(max = 500) String reason,
      String decision,
      @NotBlank String refundMode,
      @Size(max = 128) String idempotencyKey,
      @NotEmpty List<@Valid LineRequest> lines) {}

  public record CreateSalesReturnRequest(
      @NotNull UUID salesInvoiceId,
      @NotBlank @Size(max = 500) String reason,
      String decision,
      @NotBlank String refundMode,
      @NotBlank @Size(max = 128) String idempotencyKey,
      @NotEmpty List<@Valid LineRequest> lines) {}
}
