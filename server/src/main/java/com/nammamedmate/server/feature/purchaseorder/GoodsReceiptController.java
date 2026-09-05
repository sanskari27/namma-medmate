package com.nammamedmate.server.feature.purchaseorder;

import com.nammamedmate.server.application.purchaseorder.QualityCheckCommand;
import com.nammamedmate.server.application.purchaseorder.QualityCheckListResult;
import com.nammamedmate.server.application.purchaseorder.QualityCheckService;
import com.nammamedmate.server.application.purchaseorder.QualityCheckView;
import com.nammamedmate.server.domain.GoodsReceiptStatus;
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
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/goods-receipts")
public class GoodsReceiptController {

  private final QualityCheckService qualityCheckService;

  public GoodsReceiptController(QualityCheckService qualityCheckService) {
    this.qualityCheckService = qualityCheckService;
  }

  @GetMapping
  public ApiResponse<GoodsReceiptListResponse> list(Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    QualityCheckListResult result = qualityCheckService.list(principal);
    return ApiResponse.ok(
        new GoodsReceiptListResponse(result.items().stream().map(this::toSummary).toList()));
  }

  @GetMapping("/{id}")
  public ApiResponse<QualityCheckResponse> get(
      Authentication authentication, @PathVariable UUID id) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toResponse(qualityCheckService.get(principal, id)));
  }

  @PostMapping("/{id}/quality-check")
  public ApiResponse<QualityCheckResponse> qualityCheck(
      Authentication authentication,
      @PathVariable UUID id,
      @Valid @RequestBody QualityCheckRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toResponse(
            qualityCheckService.check(
                principal,
                id,
                new QualityCheckCommand(
                    request.idempotencyKey(),
                    request.visualInspectionPassed(),
                    new QualityCheckCommand.Checklist(
                        request.checklist().packagingIntact(),
                        request.checklist().labelMatches(),
                        request.checklist().batchReadable(),
                        request.checklist().noDamage()),
                    request.lines().stream()
                        .map(
                            line ->
                                new QualityCheckCommand.Line(
                                    line.goodsReceiptLineId(),
                                    line.acceptedQuantity(),
                                    line.rejectedQuantity(),
                                    line.batchNumber(),
                                    line.manufacturedOn(),
                                    line.expiresOn()))
                        .toList()))));
  }

  private GoodsReceiptSummaryResponse toSummary(QualityCheckListResult.Summary row) {
    return new GoodsReceiptSummaryResponse(
        row.id(),
        row.receiptNumber(),
        row.receiptReference(),
        row.status(),
        row.supplierLegalName(),
        row.createdAt(),
        row.checkedAt());
  }

  private QualityCheckResponse toResponse(QualityCheckView view) {
    return new QualityCheckResponse(
        view.id(),
        view.receiptNumber(),
        view.receiptReference(),
        view.status(),
        view.supplierLegalName(),
        view.createdAt(),
        view.checkedAt(),
        view.checkedByUserId(),
        view.visualInspectionPassed(),
        view.checklist() == null
            ? null
            : new ChecklistResponse(
                view.checklist().packagingIntact(),
                view.checklist().labelMatches(),
                view.checklist().batchReadable(),
                view.checklist().noDamage()),
        view.lines().stream()
            .map(
                line ->
                    new QualityCheckLineResponse(
                        line.id(),
                        line.purchaseOrderLineId(),
                        line.productId(),
                        line.productName(),
                        line.sku(),
                        line.quantity(),
                        line.unitRatePaise(),
                        line.requiresBatchTracking(),
                        line.acceptedQuantity(),
                        line.rejectedQuantity(),
                        line.batchNumber(),
                        line.manufacturedOn(),
                        line.expiresOn(),
                        line.stockMovementId()))
            .toList());
  }

  public record GoodsReceiptListResponse(List<GoodsReceiptSummaryResponse> items) {}

  public record GoodsReceiptSummaryResponse(
      UUID id,
      String receiptNumber,
      String receiptReference,
      GoodsReceiptStatus status,
      String supplierLegalName,
      Instant createdAt,
      Instant checkedAt) {}

  public record ChecklistResponse(
      Boolean packagingIntact, Boolean labelMatches, Boolean batchReadable, Boolean noDamage) {}

  public record QualityCheckLineResponse(
      UUID id,
      UUID purchaseOrderLineId,
      UUID productId,
      String productName,
      String sku,
      BigDecimal quantity,
      long unitRatePaise,
      boolean requiresBatchTracking,
      BigDecimal acceptedQuantity,
      BigDecimal rejectedQuantity,
      String batchNumber,
      LocalDate manufacturedOn,
      LocalDate expiresOn,
      UUID stockMovementId) {}

  public record QualityCheckResponse(
      UUID id,
      String receiptNumber,
      String receiptReference,
      GoodsReceiptStatus status,
      String supplierLegalName,
      Instant createdAt,
      Instant checkedAt,
      UUID checkedByUserId,
      Boolean visualInspectionPassed,
      ChecklistResponse checklist,
      List<QualityCheckLineResponse> lines) {}

  public record ChecklistRequest(
      @NotNull Boolean packagingIntact,
      @NotNull Boolean labelMatches,
      @NotNull Boolean batchReadable,
      @NotNull Boolean noDamage) {}

  public record LineRequest(
      @NotNull UUID goodsReceiptLineId,
      @NotNull BigDecimal acceptedQuantity,
      @NotNull BigDecimal rejectedQuantity,
      String batchNumber,
      LocalDate manufacturedOn,
      LocalDate expiresOn) {}

  public record QualityCheckRequest(
      @NotBlank @Size(max = 128) String idempotencyKey,
      @NotNull Boolean visualInspectionPassed,
      @NotNull @Valid ChecklistRequest checklist,
      @NotEmpty List<@Valid LineRequest> lines) {}
}
