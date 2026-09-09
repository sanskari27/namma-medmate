package com.nammamedmate.server.application.sales;

import com.nammamedmate.server.application.access.AccessQueryService;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.ModuleCode;
import com.nammamedmate.server.domain.Product;
import com.nammamedmate.server.domain.ProductCategory;
import com.nammamedmate.server.domain.SalesInvoiceLine;
import com.nammamedmate.server.domain.SalesInvoiceStatus;
import com.nammamedmate.server.domain.StockBalance;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.ProductCategoryRepository;
import com.nammamedmate.server.persistence.ProductRepository;
import com.nammamedmate.server.persistence.SalesInvoiceLineRepository;
import com.nammamedmate.server.persistence.SalesInvoiceRepository;
import com.nammamedmate.server.persistence.StockBalanceRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SalesCatalogueService {

  private static final String NO_BRANCH_CODE = "NO_ACTIVE_BRANCH";
  private static final String NO_BRANCH_MESSAGE = "Select an outlet before opening Sales.";

  private final ProductRepository productRepository;
  private final ProductCategoryRepository productCategoryRepository;
  private final StockBalanceRepository stockBalanceRepository;
  private final SalesInvoiceRepository salesInvoiceRepository;
  private final SalesInvoiceLineRepository salesInvoiceLineRepository;
  private final AppUserRepository appUserRepository;
  private final AccessQueryService accessQueryService;

  public SalesCatalogueService(
      ProductRepository productRepository,
      ProductCategoryRepository productCategoryRepository,
      StockBalanceRepository stockBalanceRepository,
      SalesInvoiceRepository salesInvoiceRepository,
      SalesInvoiceLineRepository salesInvoiceLineRepository,
      AppUserRepository appUserRepository,
      AccessQueryService accessQueryService) {
    this.productRepository = productRepository;
    this.productCategoryRepository = productCategoryRepository;
    this.stockBalanceRepository = stockBalanceRepository;
    this.salesInvoiceRepository = salesInvoiceRepository;
    this.salesInvoiceLineRepository = salesInvoiceLineRepository;
    this.appUserRepository = appUserRepository;
    this.accessQueryService = accessQueryService;
  }

  @Transactional(readOnly = true)
  public SalesCatalogueListView list(
      AuthPrincipal principal, String query, UUID categoryId, String barcode) {
    UUID tenantId = requireSalesAccess(principal);
    UUID branchId = principal.activeBranchId();
    if (branchId == null) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, NO_BRANCH_CODE, NO_BRANCH_MESSAGE);
    }

    String exactBarcode = barcode == null ? "" : barcode.trim();
    String q = query == null ? "" : query.trim();

    List<Product> products;
    if (!exactBarcode.isEmpty()) {
      products =
          productRepository.searchByTenant(tenantId, exactBarcode).stream()
              .filter(
                  product ->
                      product.getBarcode() != null
                          && product.getBarcode().equalsIgnoreCase(exactBarcode))
              .toList();
    } else if (q.isEmpty()) {
      products = productRepository.findAllByTenantIdOrderByNameAsc(tenantId);
    } else {
      products = productRepository.searchByTenant(tenantId, q);
    }

    if (categoryId != null) {
      products =
          products.stream().filter(product -> categoryId.equals(product.getCategoryId())).toList();
    }

    products =
        products.stream()
            .filter(Product::isActive)
            .filter(product -> !product.isDiscontinued())
            .toList();

    Map<UUID, ProductCategory> categories = new HashMap<>();
    for (ProductCategory category :
        productCategoryRepository.findAllByTenantIdOrderByNameAsc(tenantId)) {
      categories.put(category.getId(), category);
    }

    Map<UUID, BigDecimal> onHandByProduct = new HashMap<>();
    for (StockBalance balance :
        stockBalanceRepository.findAllByTenantIdAndBranchIdOrderByProductIdAsc(
            tenantId, branchId)) {
      onHandByProduct.merge(balance.getProductId(), balance.getQuantity(), BigDecimal::add);
    }

    Map<UUID, long[]> suggestedPrices = suggestedPrices(tenantId, branchId);

    List<SalesCatalogueItemView> items =
        products.stream()
            .map(
                product -> {
                  ProductCategory category = categories.get(product.getCategoryId());
                  long[] prices = suggestedPrices.get(product.getId());
                  return new SalesCatalogueItemView(
                      product.getId(),
                      product.getSku(),
                      product.getBarcode(),
                      product.getName(),
                      product.getGenericName(),
                      product.getBrandName(),
                      product.getCategoryId(),
                      category == null ? null : category.getName(),
                      category == null ? null : category.getIcon(),
                      product.getDosageForm(),
                      product.isPrescriptionRequired(),
                      product.getScheduleClassification(),
                      product.isControlledSubstance(),
                      product.getBaseUnit(),
                      product.getPackSize(),
                      product.getPackUnit(),
                      product.getPackDescription(),
                      product.getRackLocation(),
                      product.getReorderLevel(),
                      product.getMinimumStock(),
                      product.isRequiresBatchTracking(),
                      product.isActive(),
                      onHandByProduct.getOrDefault(product.getId(), BigDecimal.ZERO),
                      prices == null ? null : prices[0],
                      prices == null ? null : prices[1]);
                })
            .toList();

    return new SalesCatalogueListView(items);
  }

  private Map<UUID, long[]> suggestedPrices(UUID tenantId, UUID branchId) {
    List<UUID> completedIds =
        salesInvoiceRepository
            .findByTenantIdAndBranchIdAndStatusOrderByCreatedAtDesc(
                tenantId, branchId, SalesInvoiceStatus.COMPLETED)
            .stream()
            .map(invoice -> invoice.getId())
            .toList();
    Map<UUID, long[]> prices = new HashMap<>();
    if (completedIds.isEmpty()) {
      return prices;
    }
    Map<UUID, List<SalesInvoiceLine>> linesByInvoice = new HashMap<>();
    for (SalesInvoiceLine line :
        salesInvoiceLineRepository.findAllByTenantIdAndBranchIdAndSalesInvoiceIdIn(
            tenantId, branchId, completedIds)) {
      linesByInvoice
          .computeIfAbsent(line.getSalesInvoiceId(), ignored -> new ArrayList<>())
          .add(line);
    }
    // Newest invoices first; keep first price seen per product.
    for (UUID invoiceId : completedIds) {
      List<SalesInvoiceLine> lines = linesByInvoice.get(invoiceId);
      if (lines == null) {
        continue;
      }
      for (SalesInvoiceLine line : lines) {
        prices.putIfAbsent(
            line.getProductId(), new long[] {line.getMrpPaise(), line.getSellingPricePaise()});
      }
    }
    return prices;
  }

  private UUID requireSalesAccess(AuthPrincipal principal) {
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
            .orElseThrow(SalesCatalogueService::forbidden);
    if (!accessQueryService.effectiveModules(user).contains(ModuleCode.SALES)) {
      throw forbidden();
    }
    return principal.tenantId();
  }

  private static ApiException forbidden() {
    return new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Forbidden");
  }
}
