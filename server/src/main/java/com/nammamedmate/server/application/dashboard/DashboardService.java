package com.nammamedmate.server.application.dashboard;

import com.nammamedmate.server.application.access.AccessQueryService;
import com.nammamedmate.server.application.finance.AgingService;
import com.nammamedmate.server.application.finance.AgingView;
import com.nammamedmate.server.application.finance.ExpenseService;
import com.nammamedmate.server.application.inventory.InventoryAlertsView;
import com.nammamedmate.server.application.inventory.InventoryStockService;
import com.nammamedmate.server.application.inventory.StockTransferService;
import com.nammamedmate.server.application.inventory.StockTransferView;
import com.nammamedmate.server.application.purchaseorder.QualityCheckService;
import com.nammamedmate.server.application.sales.SalesInvoiceService;
import com.nammamedmate.server.application.sales.SalesInvoiceView;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.DashboardPolicy;
import com.nammamedmate.server.domain.DashboardRole;
import com.nammamedmate.server.domain.FinanceAccessPolicy;
import com.nammamedmate.server.domain.GoodsReceiptStatus;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.ModuleCode;
import com.nammamedmate.server.domain.Product;
import com.nammamedmate.server.domain.SalesInvoice;
import com.nammamedmate.server.domain.SalesInvoiceStatus;
import com.nammamedmate.server.domain.StockBalance;
import com.nammamedmate.server.domain.StockTransferStatus;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.ProductRepository;
import com.nammamedmate.server.persistence.SalesInvoiceRepository;
import com.nammamedmate.server.persistence.StockBalanceRepository;
import com.nammamedmate.server.persistence.UserBranchRepository;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DashboardService {

  private final AppUserRepository appUserRepository;
  private final AccessQueryService accessQueryService;
  private final LocationRepository locationRepository;
  private final UserBranchRepository userBranchRepository;
  private final SalesInvoiceRepository salesInvoiceRepository;
  private final ProductRepository productRepository;
  private final StockBalanceRepository stockBalanceRepository;
  private final SalesInvoiceService salesInvoiceService;
  private final InventoryStockService inventoryStockService;
  private final StockTransferService stockTransferService;
  private final QualityCheckService qualityCheckService;
  private final AgingService agingService;
  private final ExpenseService expenseService;
  private final Clock clock;

  public DashboardService(
      AppUserRepository appUserRepository,
      AccessQueryService accessQueryService,
      LocationRepository locationRepository,
      UserBranchRepository userBranchRepository,
      SalesInvoiceRepository salesInvoiceRepository,
      ProductRepository productRepository,
      StockBalanceRepository stockBalanceRepository,
      SalesInvoiceService salesInvoiceService,
      InventoryStockService inventoryStockService,
      StockTransferService stockTransferService,
      QualityCheckService qualityCheckService,
      AgingService agingService,
      ExpenseService expenseService,
      Clock clock) {
    this.appUserRepository = appUserRepository;
    this.accessQueryService = accessQueryService;
    this.locationRepository = locationRepository;
    this.userBranchRepository = userBranchRepository;
    this.salesInvoiceRepository = salesInvoiceRepository;
    this.productRepository = productRepository;
    this.stockBalanceRepository = stockBalanceRepository;
    this.salesInvoiceService = salesInvoiceService;
    this.inventoryStockService = inventoryStockService;
    this.stockTransferService = stockTransferService;
    this.qualityCheckService = qualityCheckService;
    this.agingService = agingService;
    this.expenseService = expenseService;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public DashboardView open(
      AuthPrincipal principal, String roleRaw, String branchIdRaw, String scopeRaw) {
    DashboardRole role = DashboardPolicy.requireRole(roleRaw);
    String scope = DashboardPolicy.requireScope(role, scopeRaw);
    AppUser user = requireUser(principal);
    Set<ModuleCode> modules = accessQueryService.effectiveModules(user);
    boolean accountant =
        accessQueryService.hasAssignedRoleCode(user, FinanceAccessPolicy.ACCOUNTANT_CODE);
    DashboardPolicy.requireOpen(role, user.getRole(), modules, accountant);
    List<String> permitted =
        DashboardPolicy.permitted(user.getRole(), modules, accountant).stream()
            .map(DashboardRole::wireName)
            .toList();
    UUID requested = parseUuid(branchIdRaw);
    List<UUID> branchIds = resolveBranches(principal, user, role, requested, scope);
    UUID primary = DashboardPolicy.SCOPE_TENANT.equals(scope) ? null : branchIds.get(0);
    String branchName = primary == null ? null : branchName(principal.tenantId(), primary);
    Instant now = clock.instant();
    LocalDate asOf = DashboardPolicy.today(now);
    return switch (role) {
      case CASHIER ->
          new DashboardView(
              role.wireName(),
              asOf,
              now,
              DashboardPolicy.SCOPE_BRANCH,
              primary,
              branchName,
              permitted,
              cashierDesk(principal, principal.tenantId(), primary, asOf),
              null,
              null,
              null);
      case INVENTORY ->
          new DashboardView(
              role.wireName(),
              asOf,
              now,
              DashboardPolicy.SCOPE_BRANCH,
              primary,
              branchName,
              permitted,
              null,
              inventoryDesk(principal),
              null,
              null);
      case ACCOUNTANT ->
          new DashboardView(
              role.wireName(),
              asOf,
              now,
              DashboardPolicy.SCOPE_BRANCH,
              primary,
              branchName,
              permitted,
              null,
              null,
              accountantDesk(principal, requested, null),
              null);
      case OWNER ->
          new DashboardView(
              role.wireName(),
              asOf,
              now,
              scope,
              primary,
              branchName,
              permitted,
              null,
              null,
              null,
              ownerDesk(principal, principal.tenantId(), branchIds, requested, scope, asOf));
    };
  }

  private DashboardView.CashierDesk cashierDesk(
      AuthPrincipal principal, UUID tenantId, UUID branchId, LocalDate asOf) {
    List<SalesInvoice> completed = completedToday(tenantId, List.of(branchId), asOf);
    long sales = completed.stream().mapToLong(SalesInvoice::getTotalPaise).sum();
    List<DashboardView.HoldItem> holds =
        salesInvoiceService.list(principal, SalesInvoiceStatus.HELD).items().stream()
            .map(this::toHold)
            .toList();
    return new DashboardView.CashierDesk(
        sales,
        completed.size(),
        holds,
        new DashboardView.TillSources(DashboardPolicy.SALES_HREF, DashboardPolicy.SALES_HREF));
  }

  private DashboardView.InventoryDesk inventoryDesk(AuthPrincipal principal) {
    InventoryAlertsView alerts = inventoryStockService.alerts(principal);
    List<DashboardView.LowStockItem> low =
        alerts.lowStock().stream()
            .map(
                row ->
                    new DashboardView.LowStockItem(
                        row.productId(),
                        row.productSku(),
                        row.productName(),
                        row.onHand(),
                        row.reorderLevel()))
            .toList();
    List<DashboardView.TransferItem> transfers =
        stockTransferService.list(principal, "all").items().stream()
            .filter(this::pendingTransfer)
            .map(
                row ->
                    new DashboardView.TransferItem(
                        row.id(), row.status(), row.direction(), DashboardPolicy.TRANSFERS_HREF))
            .toList();
    List<DashboardView.GrnItem> grn =
        qualityCheckService.list(principal).items().stream()
            .filter(row -> row.status() == GoodsReceiptStatus.PENDING_QC)
            .map(
                row ->
                    new DashboardView.GrnItem(
                        row.id(),
                        row.receiptNumber(),
                        row.status().name(),
                        DashboardPolicy.GRN_HREF))
            .toList();
    return new DashboardView.InventoryDesk(
        low,
        transfers,
        grn,
        new DashboardView.StockSources(
            DashboardPolicy.STOCK_HREF, DashboardPolicy.TRANSFERS_HREF, DashboardPolicy.GRN_HREF));
  }

  private DashboardView.AccountantDesk accountantDesk(
      AuthPrincipal principal, UUID requested, String scope) {
    String branchParam = requested == null ? null : requested.toString();
    AgingView ar = agingService.receivables(principal, null, branchParam, scope);
    AgingView ap = agingService.payables(principal, null, branchParam, scope);
    long expenses =
        expenseService.totals(principal, branchParam, scope, null, null, null).totalPaise();
    return new DashboardView.AccountantDesk(
        ar.totalPaise(),
        ap.totalPaise(),
        expenses,
        ar.buckets().stream()
            .map(
                bucket ->
                    new DashboardView.BucketItem(
                        bucket.key().name(), bucket.label(), bucket.totalPaise()))
            .toList(),
        new DashboardView.BooksSources(DashboardPolicy.AGING_HREF, DashboardPolicy.EXPENSES_HREF));
  }

  private DashboardView.OwnerDesk ownerDesk(
      AuthPrincipal principal,
      UUID tenantId,
      List<UUID> branchIds,
      UUID requested,
      String scope,
      LocalDate asOf) {
    List<DashboardView.BranchSales> branches = new ArrayList<>();
    long sales = 0;
    int bills = 0;
    for (UUID branchId : branchIds) {
      List<SalesInvoice> rows = completedToday(tenantId, List.of(branchId), asOf);
      long amount = rows.stream().mapToLong(SalesInvoice::getTotalPaise).sum();
      sales += amount;
      bills += rows.size();
      branches.add(new DashboardView.BranchSales(branchId, branchName(tenantId, branchId), amount));
    }
    String branchParam = requested == null ? null : requested.toString();
    String agingScope = DashboardPolicy.SCOPE_TENANT.equals(scope) ? scope : null;
    AgingView ar = agingService.receivables(principal, null, branchParam, agingScope);
    AgingView ap = agingService.payables(principal, null, branchParam, agingScope);
    long expenses =
        expenseService.totals(principal, branchParam, agingScope, null, null, null).totalPaise();
    return new DashboardView.OwnerDesk(
        sales,
        bills,
        branches,
        ar.totalPaise(),
        ap.totalPaise(),
        expenses,
        lowStockCount(tenantId, branchIds),
        new DashboardView.OwnerSources(
            DashboardPolicy.SALES_HREF,
            DashboardPolicy.STOCK_HREF,
            DashboardPolicy.AGING_HREF,
            DashboardPolicy.EXPENSES_HREF));
  }

  private List<SalesInvoice> completedToday(UUID tenantId, List<UUID> branchIds, LocalDate asOf) {
    Instant from = DashboardPolicy.startOfDay(asOf);
    Instant to = DashboardPolicy.startOfDay(asOf.plusDays(1));
    return salesInvoiceRepository.findCompletedInWindow(
        tenantId, branchIds, SalesInvoiceStatus.COMPLETED, from, to);
  }

  private int lowStockCount(UUID tenantId, List<UUID> branchIds) {
    int count = 0;
    List<Product> products = productRepository.findAllByTenantIdOrderByNameAsc(tenantId);
    for (UUID branchId : branchIds) {
      for (Product product : products) {
        if (!product.isActive() || product.getReorderLevel() == null) {
          continue;
        }
        BigDecimal onHand =
            stockBalanceRepository
                .findAllByTenantIdAndBranchIdAndProductId(tenantId, branchId, product.getId())
                .stream()
                .map(StockBalance::getQuantity)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (onHand.compareTo(BigDecimal.valueOf(product.getReorderLevel())) <= 0) {
          count++;
        }
      }
    }
    return count;
  }

  private List<UUID> resolveBranches(
      AuthPrincipal principal, AppUser user, DashboardRole role, UUID requested, String scope) {
    UUID tenantId = principal.tenantId();
    if (role == DashboardRole.CASHIER || role == DashboardRole.INVENTORY) {
      UUID session = principal.activeBranchId();
      if (session == null) {
        throw DashboardPolicy.noActiveBranch();
      }
      requireAccessibleBranch(principal, user, tenantId, session);
      if (requested != null && !requested.equals(session)) {
        throw DashboardPolicy.notFound();
      }
      return List.of(session);
    }
    if (requested != null) {
      requireAccessibleBranch(principal, user, tenantId, requested);
      return List.of(requested);
    }
    if (DashboardPolicy.SCOPE_TENANT.equals(scope)) {
      if (user.getRole() != AppUserRole.pharmacy_owner) {
        throw DashboardPolicy.shape();
      }
      List<UUID> ids =
          locationRepository
              .findAllByTenantIdAndDeletedAtIsNullOrderByBranchCodeAsc(tenantId)
              .stream()
              .map(Location::getId)
              .toList();
      if (ids.isEmpty()) {
        throw DashboardPolicy.notFound();
      }
      return ids;
    }
    UUID session = principal.activeBranchId();
    if (session == null) {
      throw DashboardPolicy.noActiveBranch();
    }
    requireAccessibleBranch(principal, user, tenantId, session);
    return List.of(session);
  }

  private void requireAccessibleBranch(
      AuthPrincipal principal, AppUser user, UUID tenantId, UUID branchId) {
    Location branch =
        locationRepository
            .findByIdAndTenantIdAndDeletedAtIsNull(branchId, tenantId)
            .orElseThrow(DashboardPolicy::notFound);
    if (user.getRole() == AppUserRole.pharmacy_owner) {
      return;
    }
    if (!userBranchRepository.existsByTenantIdAndUserIdAndBranchId(
        tenantId, principal.userId(), branch.getId())) {
      throw DashboardPolicy.notFound();
    }
  }

  private AppUser requireUser(AuthPrincipal principal) {
    if (principal == null || principal.tenantId() == null) {
      throw DashboardPolicy.forbidden();
    }
    if (principal.role() != AppUserRole.pharmacy_owner
        && principal.role() != AppUserRole.pharmacy_staff) {
      throw DashboardPolicy.forbidden();
    }
    return appUserRepository
        .findById(principal.userId())
        .filter(row -> row.getDeletedAt() == null)
        .orElseThrow(DashboardPolicy::forbidden);
  }

  private String branchName(UUID tenantId, UUID branchId) {
    return locationRepository
        .findByIdAndTenantIdAndDeletedAtIsNull(branchId, tenantId)
        .map(Location::getName)
        .orElse("Outlet");
  }

  private DashboardView.HoldItem toHold(SalesInvoiceView invoice) {
    return new DashboardView.HoldItem(
        invoice.id(), invoice.invoiceNumber(), invoice.totalPaise(), invoice.updatedAt());
  }

  private boolean pendingTransfer(StockTransferView row) {
    return StockTransferStatus.REQUESTED.name().equals(row.status())
        || StockTransferStatus.IN_TRANSIT.name().equals(row.status());
  }

  private static UUID parseUuid(String value) {
    if (value == null || value.isBlank()) {
      return null;
    }
    try {
      return UUID.fromString(value.trim());
    } catch (IllegalArgumentException ex) {
      throw DashboardPolicy.shape();
    }
  }
}
