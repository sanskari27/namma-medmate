package com.nammamedmate.server.feature.sales;

import com.nammamedmate.server.application.sales.SalesInvoiceCommand;
import com.nammamedmate.server.application.sales.SalesInvoiceService;
import com.nammamedmate.server.application.sales.SalesInvoiceView;
import com.nammamedmate.server.domain.ProductUnit;
import com.nammamedmate.server.domain.SalesInvoiceStatus;
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
@RequestMapping("/api/v1/sales/invoices")
public class SalesInvoiceController {

  private final SalesInvoiceService salesInvoiceService;

  public SalesInvoiceController(SalesInvoiceService salesInvoiceService) {
    this.salesInvoiceService = salesInvoiceService;
  }

  @GetMapping
  public ApiResponse<SalesInvoiceListResponse> list(Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        new SalesInvoiceListResponse(
            salesInvoiceService.list(principal).items().stream().map(this::toResponse).toList()));
  }

  @GetMapping("/{id}")
  public ApiResponse<SalesInvoiceResponse> get(
      Authentication authentication, @PathVariable UUID id) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toResponse(salesInvoiceService.get(principal, id)));
  }

  @PostMapping
  public ApiResponse<SalesInvoiceResponse> create(
      Authentication authentication, @Valid @RequestBody CreateSalesInvoiceRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toResponse(
            salesInvoiceService.create(
                principal,
                new SalesInvoiceCommand(
                    request.customerId(),
                    request.doctorId(),
                    request.prescriptionReference(),
                    Boolean.TRUE.equals(request.prescriptionVerified()),
                    request.idempotencyKey(),
                    null,
                    request.lines().stream().map(this::toLine).toList()))));
  }

  @PatchMapping("/{id}")
  public ApiResponse<SalesInvoiceResponse> update(
      Authentication authentication,
      @PathVariable UUID id,
      @Valid @RequestBody UpdateSalesInvoiceRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toResponse(
            salesInvoiceService.update(
                principal,
                id,
                new SalesInvoiceCommand(
                    request.customerId(),
                    request.doctorId(),
                    request.prescriptionReference(),
                    Boolean.TRUE.equals(request.prescriptionVerified()),
                    "patch",
                    request.expectedVersion(),
                    request.lines().stream().map(this::toLine).toList()))));
  }

  private SalesInvoiceCommand.Line toLine(LineRequest line) {
    return new SalesInvoiceCommand.Line(
        line.productId(),
        line.batchId(),
        line.quantity(),
        line.unit(),
        line.mrpPaise(),
        line.sellingPricePaise(),
        line.discountPaise() == null ? 0L : line.discountPaise());
  }

  private SalesInvoiceResponse toResponse(SalesInvoiceView view) {
    return new SalesInvoiceResponse(
        view.id(),
        view.tenantId(),
        view.branchId(),
        view.invoiceNumber(),
        view.status(),
        view.staffUserId(),
        view.terminalId(),
        view.customerId(),
        view.doctorId(),
        view.prescriptionReference(),
        view.prescriptionVerified(),
        view.version(),
        view.subtotalPaise(),
        view.discountPaise(),
        view.taxPaise(),
        view.totalPaise(),
        view.lines().stream()
            .map(
                line ->
                    new LineResponse(
                        line.id(),
                        line.productId(),
                        line.productName(),
                        line.sku(),
                        line.batchId(),
                        line.batchNumber(),
                        line.expiresOn(),
                        line.quantity(),
                        line.unit(),
                        line.baseQuantity(),
                        line.mrpPaise(),
                        line.sellingPricePaise(),
                        line.discountPaise(),
                        line.hsnCode(),
                        line.gstRate(),
                        line.cgstPaise(),
                        line.sgstPaise(),
                        line.igstPaise(),
                        line.lineTaxablePaise(),
                        line.lineTaxPaise(),
                        line.lineTotalPaise()))
            .toList(),
        view.createdAt(),
        view.updatedAt());
  }

  public record CreateSalesInvoiceRequest(
      UUID customerId,
      UUID doctorId,
      @Size(max = 64) String prescriptionReference,
      Boolean prescriptionVerified,
      @NotBlank @Size(max = 128) String idempotencyKey,
      @NotEmpty List<@Valid LineRequest> lines) {}

  public record UpdateSalesInvoiceRequest(
      UUID customerId,
      UUID doctorId,
      @Size(max = 64) String prescriptionReference,
      Boolean prescriptionVerified,
      @NotNull Integer expectedVersion,
      @NotEmpty List<@Valid LineRequest> lines) {}

  public record LineRequest(
      @NotNull UUID productId,
      UUID batchId,
      @NotNull BigDecimal quantity,
      @NotNull ProductUnit unit,
      @NotNull Long mrpPaise,
      @NotNull Long sellingPricePaise,
      Long discountPaise) {}

  public record SalesInvoiceListResponse(List<SalesInvoiceResponse> items) {}

  public record SalesInvoiceResponse(
      UUID id,
      UUID tenantId,
      UUID branchId,
      String invoiceNumber,
      SalesInvoiceStatus status,
      UUID staffUserId,
      UUID terminalId,
      UUID customerId,
      UUID doctorId,
      String prescriptionReference,
      boolean prescriptionVerified,
      int version,
      long subtotalPaise,
      long discountPaise,
      long taxPaise,
      long totalPaise,
      List<LineResponse> lines,
      Instant createdAt,
      Instant updatedAt) {}

  public record LineResponse(
      UUID id,
      UUID productId,
      String productName,
      String sku,
      UUID batchId,
      String batchNumber,
      LocalDate expiresOn,
      BigDecimal quantity,
      ProductUnit unit,
      BigDecimal baseQuantity,
      long mrpPaise,
      long sellingPricePaise,
      long discountPaise,
      String hsnCode,
      BigDecimal gstRate,
      long cgstPaise,
      long sgstPaise,
      long igstPaise,
      long lineTaxablePaise,
      long lineTaxPaise,
      long lineTotalPaise) {}
}
