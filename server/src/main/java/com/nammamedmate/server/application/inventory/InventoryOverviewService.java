package com.nammamedmate.server.application.inventory;

import com.nammamedmate.server.application.access.AccessQueryService;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.BranchProductStockLevel;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.Manufacturer;
import com.nammamedmate.server.domain.ModuleCode;
import com.nammamedmate.server.domain.Product;
import com.nammamedmate.server.domain.ProductCategory;
import com.nammamedmate.server.domain.SalesInvoiceLine;
import com.nammamedmate.server.domain.SalesInvoiceStatus;
import com.nammamedmate.server.domain.StockBalance;
import com.nammamedmate.server.domain.StockBatch;
import com.nammamedmate.server.domain.StockMovement;
import com.nammamedmate.server.domain.StockMovementType;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.BranchProductStockLevelRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.ManufacturerRepository;
import com.nammamedmate.server.persistence.ProductCategoryRepository;
import com.nammamedmate.server.persistence.ProductRepository;
import com.nammamedmate.server.persistence.SalesInvoiceLineRepository;
import com.nammamedmate.server.persistence.SalesInvoiceRepository;
import com.nammamedmate.server.persistence.StockBalanceRepository;
import com.nammamedmate.server.persistence.StockBatchRepository;
import com.nammamedmate.server.persistence.StockMovementRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InventoryOverviewService {

  /** Dead-stock window: no STOCK_OUT in 90 days. */
  private static final int DEAD_STOCK_DAYS = 90;

  private final AppUserRepository appUserRepository;
  private final AccessQueryService accessQueryService;
  private final InventoryStockService inventoryStockService;
  private final ProductRepository productRepository;
  private final ProductCategoryRepository productCategoryRepository;
  private final ManufacturerRepository manufacturerRepository;
  private final StockBalanceRepository stockBalanceRepository;
  private final StockBatchRepository stockBatchRepository;
  private final BranchProductStockLevelRepository branchProductStockLevelRepository;
  private final LocationRepository locationRepository;
  private final SalesInvoiceRepository salesInvoiceRepository;
  private final SalesInvoiceLineRepository salesInvoiceLineRepository;
  private final StockMovementRepository stockMovementRepository;
  private final Clock clock;

  public InventoryOverviewService(
      AppUserRepository appUserRepository,
      AccessQueryService accessQueryService,
      InventoryStockService inventoryStockService,
      ProductRepository productRepository,
      ProductCategoryRepository productCategoryRepository,
      ManufacturerRepository manufacturerRepository,
      StockBalanceRepository stockBalanceRepository,
      StockBatchRepository stockBatchRepository,
      BranchProductStockLevelRepository branchProductStockLevelRepository,
      LocationRepository locationRepository,
      SalesInvoiceRepository salesInvoiceRepository,
      SalesInvoiceLineRepository salesInvoiceLineRepository,
      StockMovementRepository stockMovementRepository,
      Clock clock) {
    this.appUserRepository = appUserRepository;
    this.accessQueryService = accessQueryService;
    this.inventoryStockService = inventoryStockService;
    this.productRepository = productRepository;
    this.productCategoryRepository = productCategoryRepository;
    this.manufacturerRepository = manufacturerRepository;
    this.stockBalanceRepository = stockBalanceRepository;
    this.stockBatchRepository = stockBatchRepository;
    this.branchProductStockLevelRepository = branchProductStockLevelRepository;
    this.locationRepository = locationRepository;
    this.salesInvoiceRepository = salesInvoiceRepository;
    this.salesInvoiceLineRepository = salesInvoiceLineRepository;
    this.stockMovementRepository = stockMovementRepository;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public InventoryOverviewView overview(AuthPrincipal principal) {
    Context ctx = requireReady(principal);
    LocalDate today = LocalDate.ofInstant(clock.instant(), ZoneOffset.UTC);
    int warnDays = expiryWarnDays(ctx);
    LocalDate expiringBefore = today.plusDays(warnDays);
    Instant deadSince = clock.instant().minusSeconds(DEAD_STOCK_DAYS * 24L * 3600L);

    List<Product> products =
        productRepository.findAllByTenantIdOrderByNameAsc(ctx.tenantId()).stream()
            .filter(Product::isActive)
            .filter(product -> !product.isDiscontinued())
            .toList();

    Map<UUID, ProductCategory> categories = new HashMap<>();
    for (ProductCategory category :
        productCategoryRepository.findAllByTenantIdOrderByNameAsc(ctx.tenantId())) {
      categories.put(category.getId(), category);
    }

    Map<UUID, String> manufacturers = new HashMap<>();
    for (Manufacturer manufacturer :
        manufacturerRepository.findAllByTenantIdOrderByNameAsc(ctx.tenantId())) {
      manufacturers.put(manufacturer.getId(), manufacturer.getName());
    }

    List<StockBalance> balances =
        ctx.branchIds().isEmpty()
            ? List.of()
            : stockBalanceRepository.findAllByTenantIdAndBranchIdIn(
                ctx.tenantId(), ctx.branchIds());

    Set<UUID> batchIds = new HashSet<>();
    for (StockBalance balance : balances) {
      if (balance.getBatchId() != null) {
        batchIds.add(balance.getBatchId());
      }
    }
    Map<UUID, StockBatch> batches = new HashMap<>();
    if (!batchIds.isEmpty()) {
      for (StockBatch batch :
          stockBatchRepository.findAllByTenantIdAndIdIn(ctx.tenantId(), batchIds)) {
        batches.put(batch.getId(), batch);
      }
    }

    Map<UUID, BranchProductStockLevel> levels = new HashMap<>();
    for (UUID branchId : ctx.branchIds()) {
      for (BranchProductStockLevel level :
          branchProductStockLevelRepository.findAllByTenantIdAndBranchId(
              ctx.tenantId(), branchId)) {
        levels.putIfAbsent(level.getProductId(), level);
      }
    }

    Map<UUID, long[]> suggestedMrp = suggestedMrp(ctx.tenantId(), ctx.branchIds());
    Set<UUID> soldRecently = productsSoldSince(ctx.tenantId(), ctx.branchIds(), deadSince);

    Map<UUID, Agg> aggs = new HashMap<>();
    for (StockBalance balance : balances) {
      Agg agg = aggs.computeIfAbsent(balance.getProductId(), ignored -> new Agg());
      agg.onHand = agg.onHand.add(balance.getQuantity());
      StockBatch batch = balance.getBatchId() == null ? null : batches.get(balance.getBatchId());
      if (batch != null) {
        agg.batchCount++;
        if (batch.getExpiresOn() != null
            && (agg.earliestExpiry == null || batch.getExpiresOn().isBefore(agg.earliestExpiry))) {
          agg.earliestExpiry = batch.getExpiresOn();
        }
        if (isExpired(batch.getExpiresOn(), today)) {
          agg.expired = true;
        }
        if (isExpiring(batch.getExpiresOn(), today, expiringBefore)) {
          agg.nearExpiry = true;
          agg.expiringQty = agg.expiringQty.add(balance.getQuantity());
          agg.expiringCostPaise += costPaise(balance.getQuantity(), batch.getPurchasePricePaise());
        }
        agg.costValuePaise += costPaise(balance.getQuantity(), batch.getPurchasePricePaise());
      }
    }

    List<InventoryOverviewView.InventoryOverviewRow> rows = new ArrayList<>();
    BigDecimal totalUnits = BigDecimal.ZERO;
    long stockCost = 0L;
    long retailValue = 0L;
    int lowStockCount = 0;
    int outOfStockCount = 0;
    int expiringCount = 0;
    long expiringValue = 0L;
    int deadStockCount = 0;
    long deadStockValue = 0L;
    int alertCount = 0;

    for (Product product : products) {
      Agg agg = aggs.getOrDefault(product.getId(), new Agg());
      Long mrpPaise = product.getDefaultMrpPaise();
      if (mrpPaise == null) {
        long[] suggested = suggestedMrp.get(product.getId());
        if (suggested != null) {
          mrpPaise = suggested[0];
        }
      }

      boolean outOfStock = agg.onHand.compareTo(BigDecimal.ZERO) <= 0;
      Integer threshold = lowThreshold(product, levels.get(product.getId()));
      boolean lowStock =
          !outOfStock
              && threshold != null
              && agg.onHand.compareTo(BigDecimal.valueOf(threshold)) <= 0;
      boolean unallocated =
          product.getRackLocation() == null || product.getRackLocation().isBlank();
      boolean deadStock = !outOfStock && !soldRecently.contains(product.getId());
      long costValue = agg.costValuePaise;
      long retail = mrpPaise == null ? 0L : costPaise(agg.onHand, mrpPaise);
      Long looseUnitPaise =
          looseUnitPaise(mrpPaise, product.getPackSize(), product.isLooseSellingEnabled());

      if (outOfStock) {
        outOfStockCount++;
      }
      if (lowStock) {
        lowStockCount++;
      }
      if (agg.nearExpiry || agg.expired) {
        expiringCount++;
        expiringValue += agg.expiringCostPaise;
      }
      if (deadStock) {
        deadStockCount++;
        deadStockValue += costValue;
      }
      if (lowStock || agg.nearExpiry || agg.expired || outOfStock) {
        alertCount++;
      }

      totalUnits = totalUnits.add(agg.onHand);
      stockCost += costValue;
      retailValue += retail;

      ProductCategory category = categories.get(product.getCategoryId());
      rows.add(
          new InventoryOverviewView.InventoryOverviewRow(
              product.getId(),
              product.getSku(),
              product.getName(),
              product.getGenericName(),
              product.getBrandName(),
              product.getManufacturerId() == null
                  ? null
                  : manufacturers.get(product.getManufacturerId()),
              product.getCategoryId(),
              category == null ? null : category.getName(),
              category == null ? null : category.getIcon(),
              product.getScheduleClassification(),
              product.isPrescriptionRequired(),
              product.getRackLocation(),
              product.getBaseUnit(),
              product.getPackUnit(),
              product.getPackSize(),
              agg.batchCount,
              agg.earliestExpiry,
              agg.expired,
              agg.nearExpiry,
              agg.onHand,
              lowStock,
              outOfStock,
              mrpPaise,
              costValue,
              retail,
              looseUnitPaise,
              product.isLooseSellingEnabled(),
              product.isOnlineListed(),
              unallocated,
              deadStock));
    }

    Integer marginPercent = null;
    if (retailValue > 0 && stockCost >= 0 && retailValue >= stockCost) {
      marginPercent = (int) Math.round(((retailValue - stockCost) * 100.0) / retailValue);
    }

    InventoryOverviewView.InventoryOverviewSummary summary =
        new InventoryOverviewView.InventoryOverviewSummary(
            rows.size(),
            totalUnits,
            stockCost,
            retailValue,
            marginPercent,
            lowStockCount,
            outOfStockCount,
            expiringCount,
            expiringValue,
            deadStockCount,
            deadStockValue,
            alertCount);

    return new InventoryOverviewView(summary, rows);
  }

  @Transactional
  public InventoryOverviewView.InventoryOverviewRow updateListingFlags(
      AuthPrincipal principal, UUID productId, Boolean looseSellingEnabled, Boolean onlineListed) {
    Context ctx = requireReady(principal);
    Product product =
        productRepository
            .findByIdAndTenantId(productId, ctx.tenantId())
            .orElseThrow(
                () -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Product was not found"));
    if (looseSellingEnabled != null) {
      product.setLooseSellingEnabled(looseSellingEnabled);
    }
    if (onlineListed != null) {
      product.setOnlineListed(onlineListed);
    }
    product.setUpdatedAt(clock.instant());
    productRepository.save(product);

    // Return refreshed row from full overview for consistency.
    return overview(principal).items().stream()
        .filter(row -> row.productId().equals(productId))
        .findFirst()
        .orElseThrow(
            () -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Product was not found"));
  }

  private Map<UUID, long[]> suggestedMrp(UUID tenantId, List<UUID> branchIds) {
    Map<UUID, long[]> prices = new HashMap<>();
    for (UUID branchId : branchIds) {
      List<UUID> completedIds =
          salesInvoiceRepository
              .findByTenantIdAndBranchIdAndStatusOrderByCreatedAtDesc(
                  tenantId, branchId, SalesInvoiceStatus.COMPLETED)
              .stream()
              .map(invoice -> invoice.getId())
              .toList();
      if (completedIds.isEmpty()) {
        continue;
      }
      Map<UUID, List<SalesInvoiceLine>> linesByInvoice = new HashMap<>();
      for (SalesInvoiceLine line :
          salesInvoiceLineRepository.findAllByTenantIdAndBranchIdAndSalesInvoiceIdIn(
              tenantId, branchId, completedIds)) {
        linesByInvoice
            .computeIfAbsent(line.getSalesInvoiceId(), ignored -> new ArrayList<>())
            .add(line);
      }
      for (UUID invoiceId : completedIds) {
        List<SalesInvoiceLine> lines = linesByInvoice.get(invoiceId);
        if (lines == null) {
          continue;
        }
        for (SalesInvoiceLine line : lines) {
          prices.putIfAbsent(line.getProductId(), new long[] {line.getMrpPaise()});
        }
      }
    }
    return prices;
  }

  private Set<UUID> productsSoldSince(UUID tenantId, List<UUID> branchIds, Instant since) {
    Set<UUID> sold = new HashSet<>();
    if (branchIds.isEmpty()) {
      return sold;
    }
    List<StockMovement> movements =
        stockMovementRepository.findByTypesInWindow(
            tenantId,
            branchIds,
            List.of(StockMovementType.STOCK_OUT),
            since,
            clock.instant().plusSeconds(1));
    for (StockMovement movement : movements) {
      sold.add(movement.getProductId());
    }
    return sold;
  }

  private static Integer lowThreshold(Product product, BranchProductStockLevel level) {
    if (level != null && level.getReorderLevel() != null) {
      return level.getReorderLevel();
    }
    if (level != null && level.getMinimumStock() != null) {
      return level.getMinimumStock();
    }
    if (product.getReorderLevel() != null) {
      return product.getReorderLevel();
    }
    return product.getMinimumStock();
  }

  private static long costPaise(BigDecimal quantity, long unitPaise) {
    if (quantity == null || quantity.compareTo(BigDecimal.ZERO) <= 0 || unitPaise <= 0) {
      return 0L;
    }
    return quantity
        .multiply(BigDecimal.valueOf(unitPaise))
        .setScale(0, RoundingMode.HALF_UP)
        .longValueExact();
  }

  private static Long looseUnitPaise(Long mrpPaise, BigDecimal packSize, boolean looseEnabled) {
    if (!looseEnabled
        || mrpPaise == null
        || packSize == null
        || packSize.compareTo(BigDecimal.ZERO) <= 0) {
      return null;
    }
    return BigDecimal.valueOf(mrpPaise).divide(packSize, 0, RoundingMode.HALF_UP).longValue();
  }

  private static boolean isExpired(LocalDate expiresOn, LocalDate today) {
    return expiresOn != null && expiresOn.isBefore(today);
  }

  private static boolean isExpiring(LocalDate expiresOn, LocalDate today, LocalDate before) {
    if (expiresOn == null || isExpired(expiresOn, today)) {
      return false;
    }
    return !expiresOn.isAfter(before);
  }

  private int expiryWarnDays(Context ctx) {
    if (ctx.branchIds().isEmpty()) {
      return 30;
    }
    int max = 0;
    for (UUID branchId : ctx.branchIds()) {
      max = Math.max(max, inventoryStockService.expiryWarnDaysForBranch(ctx.tenantId(), branchId));
    }
    return max;
  }

  private Context requireReady(AuthPrincipal principal) {
    UUID tenantId = requireModuleAccess(principal);
    UUID branchId = principal.activeBranchId();
    if (branchId != null) {
      locationRepository
          .findByIdAndTenantIdAndDeletedAtIsNull(branchId, tenantId)
          .orElseThrow(
              () -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Branch was not found"));
      return new Context(tenantId, List.of(branchId));
    }
    List<UUID> branchIds =
        locationRepository
            .findAllByTenantIdAndDeletedAtIsNullOrderByBranchCodeAsc(tenantId)
            .stream()
            .map(Location::getId)
            .toList();
    return new Context(tenantId, branchIds);
  }

  private UUID requireModuleAccess(AuthPrincipal principal) {
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
            .orElseThrow(InventoryOverviewService::forbidden);
    if (!accessQueryService.effectiveModules(user).contains(ModuleCode.INVENTORY)) {
      throw forbidden();
    }
    return principal.tenantId();
  }

  private static ApiException forbidden() {
    return new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Forbidden");
  }

  private record Context(UUID tenantId, List<UUID> branchIds) {}

  private static final class Agg {
    private BigDecimal onHand = BigDecimal.ZERO;
    private int batchCount;
    private LocalDate earliestExpiry;
    private boolean expired;
    private boolean nearExpiry;
    private BigDecimal expiringQty = BigDecimal.ZERO;
    private long expiringCostPaise;
    private long costValuePaise;
  }
}
