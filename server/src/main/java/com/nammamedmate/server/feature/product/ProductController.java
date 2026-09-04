package com.nammamedmate.server.feature.product;

import com.nammamedmate.server.application.product.ProductCommand;
import com.nammamedmate.server.application.product.ProductService;
import com.nammamedmate.server.application.product.ProductView;
import com.nammamedmate.server.domain.DosageForm;
import com.nammamedmate.server.domain.ProductRoute;
import com.nammamedmate.server.domain.ProductType;
import com.nammamedmate.server.domain.ProductUnit;
import com.nammamedmate.server.domain.ScheduleClassification;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.shared.web.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/products")
public class ProductController {

  private final ProductService productService;

  public ProductController(ProductService productService) {
    this.productService = productService;
  }

  @GetMapping
  public ApiResponse<ProductListResponse> list(
      Authentication authentication, @RequestParam(required = false) String q) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        new ProductListResponse(
            productService.list(principal, q).stream().map(this::toResponse).toList()));
  }

  @GetMapping("/{id}")
  public ApiResponse<ProductResponse> get(Authentication authentication, @PathVariable UUID id) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toResponse(productService.get(principal, id)));
  }

  @PostMapping
  public ApiResponse<ProductResponse> create(
      Authentication authentication, @Valid @RequestBody UpsertProductRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toResponse(productService.create(principal, toCommand(request))));
  }

  @PatchMapping("/{id}")
  public ApiResponse<ProductResponse> update(
      Authentication authentication,
      @PathVariable UUID id,
      @Valid @RequestBody UpsertProductRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toResponse(productService.update(principal, id, toCommand(request))));
  }

  private ProductResponse toResponse(ProductView view) {
    return new ProductResponse(
        view.id(),
        view.tenantId(),
        view.sku(),
        view.barcode(),
        view.name(),
        view.genericName(),
        view.brandName(),
        view.manufacturerId(),
        view.categoryId(),
        view.productType(),
        view.dosageForm(),
        view.therapeuticClass(),
        view.composition(),
        view.strength(),
        view.route(),
        view.prescriptionRequired(),
        view.scheduleClassification(),
        view.hsnCode(),
        view.gstRate(),
        view.baseUnit(),
        view.packSize(),
        view.packUnit(),
        view.packDescription(),
        view.storageConditions(),
        view.requiresColdStorage(),
        view.rackLocation(),
        view.reorderLevel(),
        view.reorderQuantity(),
        view.minimumStock(),
        view.discontinued(),
        view.returnable(),
        view.taxable(),
        view.taxCategory(),
        view.requiresBatchTracking(),
        view.requiresExpiryTracking(),
        view.requiresSerialTracking(),
        view.controlledSubstance(),
        view.notes(),
        view.active(),
        view.createdAt(),
        view.updatedAt());
  }

  private static ProductCommand toCommand(UpsertProductRequest request) {
    return new ProductCommand(
        request.sku(),
        request.barcode(),
        request.name(),
        request.genericName(),
        request.brandName(),
        request.manufacturerId(),
        request.categoryId(),
        request.productType(),
        request.dosageForm(),
        request.therapeuticClass(),
        request.composition(),
        request.strength(),
        request.route(),
        request.prescriptionRequired(),
        request.scheduleClassification(),
        request.hsnCode(),
        request.gstRate(),
        request.baseUnit(),
        request.packSize(),
        request.packUnit(),
        request.packDescription(),
        request.storageConditions(),
        request.requiresColdStorage(),
        request.rackLocation(),
        request.reorderLevel(),
        request.reorderQuantity(),
        request.minimumStock(),
        request.isDiscontinued(),
        request.isReturnable(),
        request.isTaxable(),
        request.taxCategory(),
        request.requiresBatchTracking(),
        request.requiresExpiryTracking(),
        request.requiresSerialTracking(),
        request.controlledSubstance(),
        request.notes(),
        request.isActive());
  }

  public record ProductListResponse(List<ProductResponse> items) {}

  public record ProductResponse(
      UUID id,
      UUID tenantId,
      String sku,
      String barcode,
      String name,
      String genericName,
      String brandName,
      UUID manufacturerId,
      UUID categoryId,
      ProductType productType,
      DosageForm dosageForm,
      String therapeuticClass,
      String composition,
      String strength,
      ProductRoute route,
      boolean prescriptionRequired,
      ScheduleClassification scheduleClassification,
      String hsnCode,
      BigDecimal gstRate,
      ProductUnit baseUnit,
      BigDecimal packSize,
      ProductUnit packUnit,
      String packDescription,
      String storageConditions,
      boolean requiresColdStorage,
      String rackLocation,
      Integer reorderLevel,
      Integer reorderQuantity,
      Integer minimumStock,
      boolean isDiscontinued,
      boolean isReturnable,
      boolean isTaxable,
      String taxCategory,
      boolean requiresBatchTracking,
      boolean requiresExpiryTracking,
      boolean requiresSerialTracking,
      boolean controlledSubstance,
      String notes,
      boolean isActive,
      Instant createdAt,
      Instant updatedAt) {}

  public record UpsertProductRequest(
      @NotBlank @Size(max = 64) String sku,
      @Size(max = 64) String barcode,
      @NotBlank @Size(max = 200) String name,
      @Size(max = 200) String genericName,
      @Size(max = 200) String brandName,
      UUID manufacturerId,
      @NotNull UUID categoryId,
      @NotNull ProductType productType,
      @NotNull DosageForm dosageForm,
      @Size(max = 200) String therapeuticClass,
      String composition,
      @Size(max = 100) String strength,
      ProductRoute route,
      @NotNull Boolean prescriptionRequired,
      ScheduleClassification scheduleClassification,
      @Size(max = 16) String hsnCode,
      BigDecimal gstRate,
      @NotNull ProductUnit baseUnit,
      @NotNull BigDecimal packSize,
      @NotNull ProductUnit packUnit,
      @Size(max = 200) String packDescription,
      @Size(max = 500) String storageConditions,
      @NotNull Boolean requiresColdStorage,
      @Size(max = 100) String rackLocation,
      Integer reorderLevel,
      Integer reorderQuantity,
      Integer minimumStock,
      Boolean isDiscontinued,
      Boolean isReturnable,
      Boolean isTaxable,
      @Size(max = 64) String taxCategory,
      Boolean requiresBatchTracking,
      Boolean requiresExpiryTracking,
      Boolean requiresSerialTracking,
      Boolean controlledSubstance,
      String notes,
      @NotNull Boolean isActive) {}
}
