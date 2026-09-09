package com.nammamedmate.server.feature.sales;

import com.nammamedmate.server.application.sales.SalesCatalogueItemView;
import com.nammamedmate.server.application.sales.SalesCatalogueListView;
import com.nammamedmate.server.application.sales.SalesCatalogueService;
import com.nammamedmate.server.domain.DosageForm;
import com.nammamedmate.server.domain.ProductUnit;
import com.nammamedmate.server.domain.ScheduleClassification;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.shared.web.ApiResponse;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/sales/catalogue")
public class SalesCatalogueController {

  private final SalesCatalogueService salesCatalogueService;

  public SalesCatalogueController(SalesCatalogueService salesCatalogueService) {
    this.salesCatalogueService = salesCatalogueService;
  }

  @GetMapping
  public ApiResponse<CatalogueListResponse> list(
      Authentication authentication,
      @RequestParam(required = false) String q,
      @RequestParam(required = false) UUID categoryId,
      @RequestParam(required = false) String barcode) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    SalesCatalogueListView view = salesCatalogueService.list(principal, q, categoryId, barcode);
    return ApiResponse.ok(
        new CatalogueListResponse(view.items().stream().map(CatalogueItemResponse::from).toList()));
  }

  public record CatalogueListResponse(List<CatalogueItemResponse> items) {}

  public record CatalogueItemResponse(
      UUID id,
      String sku,
      String barcode,
      String name,
      String genericName,
      String brandName,
      UUID categoryId,
      String categoryName,
      String categoryIcon,
      DosageForm dosageForm,
      boolean prescriptionRequired,
      ScheduleClassification scheduleClassification,
      boolean controlledSubstance,
      ProductUnit baseUnit,
      BigDecimal packSize,
      ProductUnit packUnit,
      String packDescription,
      String rackLocation,
      Integer reorderLevel,
      Integer minimumStock,
      boolean requiresBatchTracking,
      boolean active,
      BigDecimal onHandQuantity,
      Long suggestedMrpPaise,
      Long suggestedSellingPaise) {

    static CatalogueItemResponse from(SalesCatalogueItemView item) {
      return new CatalogueItemResponse(
          item.id(),
          item.sku(),
          item.barcode(),
          item.name(),
          item.genericName(),
          item.brandName(),
          item.categoryId(),
          item.categoryName(),
          item.categoryIcon(),
          item.dosageForm(),
          item.prescriptionRequired(),
          item.scheduleClassification(),
          item.controlledSubstance(),
          item.baseUnit(),
          item.packSize(),
          item.packUnit(),
          item.packDescription(),
          item.rackLocation(),
          item.reorderLevel(),
          item.minimumStock(),
          item.requiresBatchTracking(),
          item.active(),
          item.onHandQuantity(),
          item.suggestedMrpPaise(),
          item.suggestedSellingPaise());
    }
  }
}
