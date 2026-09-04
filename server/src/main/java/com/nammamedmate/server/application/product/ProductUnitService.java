package com.nammamedmate.server.application.product;

import com.nammamedmate.server.application.access.AccessQueryService;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.ModuleCode;
import com.nammamedmate.server.domain.Product;
import com.nammamedmate.server.domain.ProductUnit;
import com.nammamedmate.server.domain.ProductUnitConversion;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.ProductRepository;
import com.nammamedmate.server.persistence.ProductUnitConversionRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.util.EnumMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProductUnitService {

  private final ProductRepository productRepository;
  private final ProductUnitConversionRepository conversionRepository;
  private final AppUserRepository appUserRepository;
  private final AccessQueryService accessQueryService;
  private final Clock clock;

  public ProductUnitService(
      ProductRepository productRepository,
      ProductUnitConversionRepository conversionRepository,
      AppUserRepository appUserRepository,
      AccessQueryService accessQueryService,
      Clock clock) {
    this.productRepository = productRepository;
    this.conversionRepository = conversionRepository;
    this.appUserRepository = appUserRepository;
    this.accessQueryService = accessQueryService;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public ProductUnitsView list(AuthPrincipal principal, UUID productId) {
    UUID tenantId = requireUnitsReadAccess(principal);
    Product product = requireProduct(productId, tenantId);
    return toView(product, conversions(tenantId, productId));
  }

  @Transactional
  public ProductUnitsView replace(
      AuthPrincipal principal, UUID productId, ProductUnitsReplaceCommand command) {
    UUID tenantId = requireInventoryAccess(principal);
    Product product = requireProduct(productId, tenantId);
    if (command == null || command.units() == null) {
      throw validationError();
    }
    int precision =
        command.quantityPrecision() == null
            ? product.getQuantityPrecision()
            : command.quantityPrecision();
    if (precision < 0 || precision > 4) {
      throw validationError();
    }

    validateUnitList(product.getBaseUnit(), command.units(), precision);

    Instant now = clock.instant();
    Map<ProductUnit, ProductUnitConversion> existing =
        conversions(tenantId, productId).stream()
            .collect(Collectors.toMap(ProductUnitConversion::getUnit, Function.identity()));

    Set<ProductUnit> keep = new HashSet<>();
    for (ProductUnitsReplaceCommand.UnitFactor item : command.units()) {
      keep.add(item.unit());
      ProductUnitConversion row = existing.get(item.unit());
      if (row == null) {
        row = new ProductUnitConversion();
        row.setId(UUID.randomUUID());
        row.setTenantId(tenantId);
        row.setProductId(productId);
        row.setUnit(item.unit());
        row.setFactorToBase(item.factorToBase());
        row.setVersion(1);
        row.setCreatedAt(now);
        row.setUpdatedAt(now);
        conversionRepository.save(row);
      } else if (row.getFactorToBase().compareTo(item.factorToBase()) != 0) {
        row.setFactorToBase(item.factorToBase());
        row.setVersion(row.getVersion() + 1);
        row.setUpdatedAt(now);
        conversionRepository.save(row);
      }
    }

    for (ProductUnitConversion row : existing.values()) {
      if (!keep.contains(row.getUnit())) {
        conversionRepository.delete(row);
      }
    }

    product.setQuantityPrecision(precision);
    product.setUpdatedAt(now);
    productRepository.save(product);

    return toView(product, conversions(tenantId, productId));
  }

  @Transactional(readOnly = true)
  public ProductUnitConvertView convert(
      AuthPrincipal principal, UUID productId, ProductUnitConvertCommand command) {
    UUID tenantId = requireUnitsReadAccess(principal);
    Product product = requireProduct(productId, tenantId);
    if (command == null
        || command.quantity() == null
        || command.fromUnit() == null
        || command.quantity().compareTo(BigDecimal.ZERO) <= 0) {
      throw validationError();
    }

    List<ProductUnitConversion> rows = conversions(tenantId, productId);
    Map<ProductUnit, BigDecimal> factors = factorMap(rows);
    Map<ProductUnit, Integer> versions =
        rows.stream()
            .collect(
                Collectors.toMap(
                    ProductUnitConversion::getUnit, ProductUnitConversion::getVersion));

    ProductUnit toUnit = command.toUnit() == null ? product.getBaseUnit() : command.toUnit();
    int precision = product.getQuantityPrecision();
    BigDecimal baseQuantity =
        ProductUnitConverter.toBase(
            command.quantity(), command.fromUnit(), product.getBaseUnit(), factors, precision);
    BigDecimal quantity =
        ProductUnitConverter.convert(
            command.quantity(),
            command.fromUnit(),
            toUnit,
            product.getBaseUnit(),
            factors,
            precision);

    Integer version =
        command.fromUnit() == product.getBaseUnit() ? null : versions.get(command.fromUnit());
    BigDecimal factor =
        command.fromUnit() == product.getBaseUnit()
            ? BigDecimal.ONE
            : factors.get(command.fromUnit());
    if (command.fromUnit() != product.getBaseUnit() && factor == null) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY, "UNKNOWN_UNIT", "Unit is not defined for this product.");
    }

    return new ProductUnitConvertView(
        quantity,
        toUnit,
        baseQuantity,
        product.getBaseUnit(),
        command.quantity(),
        command.fromUnit(),
        version,
        factor);
  }

  @Transactional
  public void syncPackConversion(Product product) {
    if (product.getPackUnit() == null
        || product.getBaseUnit() == null
        || product.getPackUnit() == product.getBaseUnit()
        || product.getPackSize() == null
        || product.getPackSize().compareTo(BigDecimal.ZERO) <= 0) {
      return;
    }
    ProductUnitConverter.assertValidFactor(product.getPackSize(), product.getQuantityPrecision());
    Instant now = clock.instant();
    var existing =
        conversionRepository.findByTenantIdAndProductIdAndUnit(
            product.getTenantId(), product.getId(), product.getPackUnit());
    if (existing.isEmpty()) {
      ProductUnitConversion created = new ProductUnitConversion();
      created.setId(UUID.randomUUID());
      created.setTenantId(product.getTenantId());
      created.setProductId(product.getId());
      created.setUnit(product.getPackUnit());
      created.setFactorToBase(product.getPackSize());
      created.setVersion(1);
      created.setCreatedAt(now);
      created.setUpdatedAt(now);
      conversionRepository.save(created);
      return;
    }
    ProductUnitConversion row = existing.get();
    if (row.getFactorToBase().compareTo(product.getPackSize()) == 0) {
      return;
    }
    row.setFactorToBase(product.getPackSize());
    row.setVersion(row.getVersion() + 1);
    row.setUpdatedAt(now);
    conversionRepository.save(row);
  }

  private void validateUnitList(
      ProductUnit baseUnit, List<ProductUnitsReplaceCommand.UnitFactor> units, int precision) {
    Set<ProductUnit> seen = new HashSet<>();
    for (ProductUnitsReplaceCommand.UnitFactor item : units) {
      if (item == null || item.unit() == null || item.factorToBase() == null) {
        throw validationError();
      }
      if (item.unit() == baseUnit) {
        throw new ApiException(
            HttpStatus.UNPROCESSABLE_ENTITY,
            "CIRCULAR_CONVERSION",
            "Base unit cannot be redefined as a conversion.");
      }
      if (!seen.add(item.unit())) {
        throw new ApiException(
            HttpStatus.UNPROCESSABLE_ENTITY,
            "DUPLICATE_UNIT",
            "Duplicate unit conversion is not allowed.");
      }
      ProductUnitConverter.assertValidFactor(item.factorToBase(), precision);
    }
  }

  private List<ProductUnitConversion> conversions(UUID tenantId, UUID productId) {
    return conversionRepository.findAllByTenantIdAndProductIdOrderByUnitAsc(tenantId, productId);
  }

  private static Map<ProductUnit, BigDecimal> factorMap(List<ProductUnitConversion> rows) {
    Map<ProductUnit, BigDecimal> factors = new EnumMap<>(ProductUnit.class);
    for (ProductUnitConversion row : rows) {
      factors.put(row.getUnit(), row.getFactorToBase());
    }
    return factors;
  }

  private static ProductUnitsView toView(Product product, List<ProductUnitConversion> rows) {
    return new ProductUnitsView(
        product.getBaseUnit(),
        product.getQuantityPrecision(),
        rows.stream()
            .map(
                row ->
                    new ProductUnitsView.ProductUnitConversionView(
                        row.getUnit(), row.getFactorToBase(), row.getVersion()))
            .toList());
  }

  private Product requireProduct(UUID productId, UUID tenantId) {
    return productRepository
        .findByIdAndTenantId(productId, tenantId)
        .orElseThrow(
            () -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Product was not found"));
  }

  private UUID requireUnitsReadAccess(AuthPrincipal principal) {
    return requireModuleAccess(principal, Set.of(ModuleCode.INVENTORY, ModuleCode.SALES));
  }

  private UUID requireInventoryAccess(AuthPrincipal principal) {
    return requireModuleAccess(principal, Set.of(ModuleCode.INVENTORY));
  }

  private UUID requireModuleAccess(AuthPrincipal principal, Set<ModuleCode> allowed) {
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
            .orElseThrow(this::forbidden);
    Set<ModuleCode> modules = accessQueryService.effectiveModules(user);
    if (allowed.stream().noneMatch(modules::contains)) {
      throw forbidden();
    }
    return principal.tenantId();
  }

  private ApiException forbidden() {
    return new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Forbidden");
  }

  private static ApiException validationError() {
    return new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
  }
}
