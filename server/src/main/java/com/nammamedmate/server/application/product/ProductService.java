package com.nammamedmate.server.application.product;

import com.nammamedmate.server.application.access.AccessQueryService;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.ModuleCode;
import com.nammamedmate.server.domain.Product;
import com.nammamedmate.server.domain.ProductType;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.ManufacturerRepository;
import com.nammamedmate.server.persistence.ProductCategoryRepository;
import com.nammamedmate.server.persistence.ProductRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProductService {

  static final String SKU_TAKEN_CODE = "SKU_TAKEN";
  static final String SKU_TAKEN_MESSAGE = "A product with this SKU already exists.";

  private static final Set<BigDecimal> ALLOWED_GST_RATES =
      Set.of(
          new BigDecimal("0"),
          new BigDecimal("5"),
          new BigDecimal("12"),
          new BigDecimal("18"),
          new BigDecimal("28"));

  private final ProductRepository productRepository;
  private final ProductCategoryRepository productCategoryRepository;
  private final ManufacturerRepository manufacturerRepository;
  private final AppUserRepository appUserRepository;
  private final AccessQueryService accessQueryService;
  private final ProductUnitService productUnitService;
  private final Clock clock;

  public ProductService(
      ProductRepository productRepository,
      ProductCategoryRepository productCategoryRepository,
      ManufacturerRepository manufacturerRepository,
      AppUserRepository appUserRepository,
      AccessQueryService accessQueryService,
      ProductUnitService productUnitService,
      Clock clock) {
    this.productRepository = productRepository;
    this.productCategoryRepository = productCategoryRepository;
    this.manufacturerRepository = manufacturerRepository;
    this.appUserRepository = appUserRepository;
    this.accessQueryService = accessQueryService;
    this.productUnitService = productUnitService;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public List<ProductView> list(AuthPrincipal principal, String query) {
    UUID tenantId = requireInventoryAccess(principal);
    String q = query == null ? "" : query.trim();
    List<Product> rows =
        q.isEmpty()
            ? productRepository.findAllByTenantIdOrderByNameAsc(tenantId)
            : productRepository.searchByTenant(tenantId, q);
    return rows.stream().map(ProductService::toView).toList();
  }

  @Transactional(readOnly = true)
  public ProductView get(AuthPrincipal principal, UUID id) {
    UUID tenantId = requireInventoryAccess(principal);
    return toView(requireProduct(id, tenantId));
  }

  @Transactional
  public ProductView create(AuthPrincipal principal, ProductCommand command) {
    UUID tenantId = requireInventoryAccess(principal);
    NormalizedProduct normalized = normalize(command);
    assertSkuAvailable(tenantId, normalized.sku(), null);
    requireCategory(tenantId, normalized.categoryId());
    if (normalized.manufacturerId() != null) {
      requireManufacturer(tenantId, normalized.manufacturerId());
    }
    assertTrackingConsistent(normalized);

    Instant now = clock.instant();
    Product product = new Product();
    product.setId(UUID.randomUUID());
    product.setTenantId(tenantId);
    product.setQuantityPrecision(0);
    apply(product, normalized);
    product.setCreatedAt(now);
    product.setUpdatedAt(now);
    Product saved = productRepository.save(product);
    productUnitService.syncPackConversion(saved);
    return toView(saved);
  }

  @Transactional
  public ProductView update(AuthPrincipal principal, UUID id, ProductCommand command) {
    UUID tenantId = requireInventoryAccess(principal);
    Product product = requireProduct(id, tenantId);
    NormalizedProduct normalized = normalize(command);
    assertSkuAvailable(tenantId, normalized.sku(), id);
    requireCategory(tenantId, normalized.categoryId());
    if (normalized.manufacturerId() != null) {
      requireManufacturer(tenantId, normalized.manufacturerId());
    }
    assertTrackingConsistent(normalized);

    apply(product, normalized);
    product.setUpdatedAt(clock.instant());
    Product saved = productRepository.save(product);
    productUnitService.syncPackConversion(saved);
    return toView(saved);
  }

  private UUID requireInventoryAccess(AuthPrincipal principal) {
    if (principal == null || principal.tenantId() == null) {
      throw forbidden();
    }
    if (principal.role() != AppUserRole.pharmacy_owner
        && principal.role() != AppUserRole.pharmacy_staff) {
      throw forbidden();
    }
    AppUser user =
        appUserRepository
            .findById(principal.userId())
            .filter(row -> row.getDeletedAt() == null)
            .orElseThrow(ProductService::forbidden);
    if (!accessQueryService.effectiveModules(user).contains(ModuleCode.INVENTORY)) {
      throw forbidden();
    }
    return principal.tenantId();
  }

  private Product requireProduct(UUID id, UUID tenantId) {
    return productRepository
        .findByIdAndTenantId(id, tenantId)
        .orElseThrow(
            () -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Product was not found"));
  }

  private void requireCategory(UUID tenantId, UUID categoryId) {
    productCategoryRepository
        .findByIdAndTenantId(categoryId, tenantId)
        .orElseThrow(
            () -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Category was not found"));
  }

  private void requireManufacturer(UUID tenantId, UUID manufacturerId) {
    manufacturerRepository
        .findByIdAndTenantId(manufacturerId, tenantId)
        .orElseThrow(
            () ->
                new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Manufacturer was not found"));
  }

  private void assertSkuAvailable(UUID tenantId, String sku, UUID excludeId) {
    productRepository
        .findByTenantIdAndSku(tenantId, sku)
        .ifPresent(
            existing -> {
              if (excludeId == null || !existing.getId().equals(excludeId)) {
                throw new ApiException(HttpStatus.CONFLICT, SKU_TAKEN_CODE, SKU_TAKEN_MESSAGE);
              }
            });
  }

  private static void assertTrackingConsistent(NormalizedProduct normalized) {
    if (normalized.requiresExpiryTracking() && !normalized.requiresBatchTracking()) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          "VALIDATION_ERROR",
          "Expiry tracking requires batch tracking");
    }
    if (normalized.requiresSerialTracking()
        && normalized.productType() != ProductType.Device
        && normalized.productType() != ProductType.Surgical) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          "VALIDATION_ERROR",
          "Serial tracking is only allowed for Device or Surgical products");
    }
  }

  private static NormalizedProduct normalize(ProductCommand command) {
    if (command == null) {
      throw validationError();
    }
    String sku = requireText(command.sku(), 64);
    String name = requireText(command.name(), 200);
    if (command.categoryId() == null) {
      throw validationError();
    }
    if (command.productType() == null
        || command.dosageForm() == null
        || command.baseUnit() == null
        || command.packUnit() == null
        || command.packSize() == null
        || command.prescriptionRequired() == null
        || command.requiresColdStorage() == null
        || command.active() == null) {
      throw validationError();
    }
    if (command.packSize().compareTo(BigDecimal.ZERO) <= 0) {
      throw validationError();
    }

    String hsnCode = blankToNull(command.hsnCode());
    if (hsnCode != null && !hsnCode.matches("\\d{4,8}")) {
      throw validationError();
    }

    BigDecimal gstRate = normalizeGstRate(command.gstRate());

    return new NormalizedProduct(
        sku,
        blankToNull(command.barcode()),
        name,
        blankToNull(command.genericName()),
        blankToNull(command.brandName()),
        command.manufacturerId(),
        command.categoryId(),
        command.productType(),
        command.dosageForm(),
        blankToNull(command.therapeuticClass()),
        blankToNull(command.composition()),
        blankToNull(command.strength()),
        command.route(),
        command.prescriptionRequired(),
        command.scheduleClassification(),
        hsnCode,
        gstRate,
        command.baseUnit(),
        command.packSize(),
        command.packUnit(),
        blankToNull(command.packDescription()),
        blankToNull(command.storageConditions()),
        command.requiresColdStorage(),
        blankToNull(command.rackLocation()),
        command.reorderLevel(),
        command.reorderQuantity(),
        command.minimumStock(),
        Boolean.TRUE.equals(command.discontinued()),
        command.returnable() == null || command.returnable(),
        command.taxable() == null || command.taxable(),
        blankToNull(command.taxCategory()),
        Boolean.TRUE.equals(command.requiresBatchTracking()),
        Boolean.TRUE.equals(command.requiresExpiryTracking()),
        Boolean.TRUE.equals(command.requiresSerialTracking()),
        Boolean.TRUE.equals(command.controlledSubstance()),
        blankToNull(command.notes()),
        command.active());
  }

  private static void apply(Product product, NormalizedProduct normalized) {
    product.setSku(normalized.sku());
    product.setBarcode(normalized.barcode());
    product.setName(normalized.name());
    product.setGenericName(normalized.genericName());
    product.setBrandName(normalized.brandName());
    product.setManufacturerId(normalized.manufacturerId());
    product.setCategoryId(normalized.categoryId());
    product.setProductType(normalized.productType());
    product.setDosageForm(normalized.dosageForm());
    product.setTherapeuticClass(normalized.therapeuticClass());
    product.setComposition(normalized.composition());
    product.setStrength(normalized.strength());
    product.setRoute(normalized.route());
    product.setPrescriptionRequired(normalized.prescriptionRequired());
    product.setScheduleClassification(normalized.scheduleClassification());
    product.setHsnCode(normalized.hsnCode());
    product.setGstRate(normalized.gstRate());
    product.setBaseUnit(normalized.baseUnit());
    product.setPackSize(normalized.packSize());
    product.setPackUnit(normalized.packUnit());
    product.setPackDescription(normalized.packDescription());
    product.setStorageConditions(normalized.storageConditions());
    product.setRequiresColdStorage(normalized.requiresColdStorage());
    product.setRackLocation(normalized.rackLocation());
    product.setReorderLevel(normalized.reorderLevel());
    product.setReorderQuantity(normalized.reorderQuantity());
    product.setMinimumStock(normalized.minimumStock());
    product.setDiscontinued(normalized.discontinued());
    product.setReturnable(normalized.returnable());
    product.setTaxable(normalized.taxable());
    product.setTaxCategory(normalized.taxCategory());
    product.setRequiresBatchTracking(normalized.requiresBatchTracking());
    product.setRequiresExpiryTracking(normalized.requiresExpiryTracking());
    product.setRequiresSerialTracking(normalized.requiresSerialTracking());
    product.setControlledSubstance(normalized.controlledSubstance());
    product.setNotes(normalized.notes());
    product.setActive(normalized.active());
  }

  private static ProductView toView(Product product) {
    return new ProductView(
        product.getId(),
        product.getTenantId(),
        product.getSku(),
        product.getBarcode(),
        product.getName(),
        product.getGenericName(),
        product.getBrandName(),
        product.getManufacturerId(),
        product.getCategoryId(),
        product.getProductType(),
        product.getDosageForm(),
        product.getTherapeuticClass(),
        product.getComposition(),
        product.getStrength(),
        product.getRoute(),
        product.isPrescriptionRequired(),
        product.getScheduleClassification(),
        product.getHsnCode(),
        product.getGstRate(),
        product.getBaseUnit(),
        product.getPackSize(),
        product.getPackUnit(),
        product.getPackDescription(),
        product.getStorageConditions(),
        product.isRequiresColdStorage(),
        product.getRackLocation(),
        product.getReorderLevel(),
        product.getReorderQuantity(),
        product.getMinimumStock(),
        product.isDiscontinued(),
        product.isReturnable(),
        product.isTaxable(),
        product.getTaxCategory(),
        product.isRequiresBatchTracking(),
        product.isRequiresExpiryTracking(),
        product.isRequiresSerialTracking(),
        product.isControlledSubstance(),
        product.getNotes(),
        product.isActive(),
        product.getCreatedAt(),
        product.getUpdatedAt());
  }

  private static BigDecimal normalizeGstRate(BigDecimal gstRate) {
    if (gstRate == null) {
      return null;
    }
    boolean allowed = ALLOWED_GST_RATES.stream().anyMatch(rate -> rate.compareTo(gstRate) == 0);
    if (!allowed) {
      throw validationError();
    }
    BigDecimal normalized = gstRate.stripTrailingZeros();
    if (normalized.scale() < 0) {
      normalized = normalized.setScale(0);
    }
    return normalized;
  }

  private static String requireText(String value, int max) {
    if (value == null || value.isBlank()) {
      throw validationError();
    }
    String trimmed = value.trim();
    if (trimmed.length() > max) {
      throw validationError();
    }
    return trimmed;
  }

  private static String blankToNull(String value) {
    if (value == null || value.isBlank()) {
      return null;
    }
    return value.trim();
  }

  private static ApiException validationError() {
    return new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
  }

  private static ApiException forbidden() {
    return new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Forbidden");
  }

  private record NormalizedProduct(
      String sku,
      String barcode,
      String name,
      String genericName,
      String brandName,
      UUID manufacturerId,
      UUID categoryId,
      ProductType productType,
      com.nammamedmate.server.domain.DosageForm dosageForm,
      String therapeuticClass,
      String composition,
      String strength,
      com.nammamedmate.server.domain.ProductRoute route,
      boolean prescriptionRequired,
      com.nammamedmate.server.domain.ScheduleClassification scheduleClassification,
      String hsnCode,
      BigDecimal gstRate,
      com.nammamedmate.server.domain.ProductUnit baseUnit,
      BigDecimal packSize,
      com.nammamedmate.server.domain.ProductUnit packUnit,
      String packDescription,
      String storageConditions,
      boolean requiresColdStorage,
      String rackLocation,
      Integer reorderLevel,
      Integer reorderQuantity,
      Integer minimumStock,
      boolean discontinued,
      boolean returnable,
      boolean taxable,
      String taxCategory,
      boolean requiresBatchTracking,
      boolean requiresExpiryTracking,
      boolean requiresSerialTracking,
      boolean controlledSubstance,
      String notes,
      boolean active) {}
}
