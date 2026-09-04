package com.nammamedmate.server.application.productcategory;

import com.nammamedmate.server.application.access.AccessQueryService;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.ModuleCode;
import com.nammamedmate.server.domain.ProductCategory;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.ProductCategoryRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProductCategoryService {

  private final ProductCategoryRepository productCategoryRepository;
  private final AppUserRepository appUserRepository;
  private final AccessQueryService accessQueryService;
  private final Clock clock;

  public ProductCategoryService(
      ProductCategoryRepository productCategoryRepository,
      AppUserRepository appUserRepository,
      AccessQueryService accessQueryService,
      Clock clock) {
    this.productCategoryRepository = productCategoryRepository;
    this.appUserRepository = appUserRepository;
    this.accessQueryService = accessQueryService;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public List<ProductCategoryView> list(AuthPrincipal principal) {
    UUID tenantId = requireInventoryAccess(principal);
    return productCategoryRepository.findAllByTenantIdOrderByNameAsc(tenantId).stream()
        .map(ProductCategoryService::toView)
        .toList();
  }

  @Transactional
  public ProductCategoryView create(AuthPrincipal principal, String name) {
    UUID tenantId = requireInventoryAccess(principal);
    String normalized = requireName(name);
    productCategoryRepository
        .findByTenantIdAndNameIgnoreCase(tenantId, normalized)
        .ifPresent(
            existing -> {
              throw new ApiException(
                  HttpStatus.CONFLICT,
                  "CATEGORY_TAKEN",
                  "A category with this name already exists");
            });

    Instant now = clock.instant();
    ProductCategory category = new ProductCategory();
    category.setId(UUID.randomUUID());
    category.setTenantId(tenantId);
    category.setName(normalized);
    category.setCreatedAt(now);
    category.setUpdatedAt(now);
    return toView(productCategoryRepository.save(category));
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
            .orElseThrow(ProductCategoryService::forbidden);
    if (!accessQueryService.effectiveModules(user).contains(ModuleCode.INVENTORY)) {
      throw forbidden();
    }
    return principal.tenantId();
  }

  private static String requireName(String name) {
    if (name == null || name.isBlank()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
    String trimmed = name.trim();
    if (trimmed.length() > 200) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
    return trimmed;
  }

  private static ProductCategoryView toView(ProductCategory category) {
    return new ProductCategoryView(
        category.getId(),
        category.getTenantId(),
        category.getName(),
        category.getCreatedAt(),
        category.getUpdatedAt());
  }

  private static ApiException forbidden() {
    return new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Forbidden");
  }
}
