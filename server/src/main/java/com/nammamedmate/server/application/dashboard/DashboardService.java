package com.nammamedmate.server.application.dashboard;

import com.nammamedmate.server.application.access.AccessQueryService;
import com.nammamedmate.server.application.finance.AgingService;
import com.nammamedmate.server.application.finance.AgingView;
import com.nammamedmate.server.application.finance.ExpenseService;
import com.nammamedmate.server.application.inventory.InventoryAlertsView;
import com.nammamedmate.server.application.inventory.InventoryReorderLine;
import com.nammamedmate.server.application.inventory.InventoryStockService;
import com.nammamedmate.server.application.inventory.StockTransferService;
import com.nammamedmate.server.application.inventory.StockTransferView;
import com.nammamedmate.server.application.purchaseorder.QualityCheckService;
import com.nammamedmate.server.application.sales.SalesInvoiceService;
import com.nammamedmate.server.application.sales.SalesInvoiceView;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.ApprovalRequest;
import com.nammamedmate.server.domain.ApprovalRequestStatus;
import com.nammamedmate.server.domain.ComplianceLicense;
import com.nammamedmate.server.domain.DashboardPolicy;
import com.nammamedmate.server.domain.DashboardRole;
import com.nammamedmate.server.domain.FinanceAccessPolicy;
import com.nammamedmate.server.domain.GoodsReceiptStatus;
import com.nammamedmate.server.domain.KycSubmission;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.ModuleCode;
import com.nammamedmate.server.domain.Product;
import com.nammamedmate.server.domain.PurchaseOrder;
import com.nammamedmate.server.domain.PurchaseOrderStatus;
import com.nammamedmate.server.domain.SalesInvoice;
import com.nammamedmate.server.domain.SalesInvoiceLine;
import com.nammamedmate.server.domain.SalesInvoiceStatus;
import com.nammamedmate.server.domain.StockBalance;
import com.nammamedmate.server.domain.StockBatch;
import com.nammamedmate.server.domain.StockTransfer;
import com.nammamedmate.server.domain.StockTransferStatus;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.ApprovalRequestRepository;
import com.nammamedmate.server.persistence.ComplianceLicenseRepository;
import com.nammamedmate.server.persistence.KycSubmissionRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.ProductRepository;
import com.nammamedmate.server.persistence.PurchaseOrderRepository;
import com.nammamedmate.server.persistence.SalesInvoiceLineRepository;
import com.nammamedmate.server.persistence.SalesInvoiceRepository;
import com.nammamedmate.server.persistence.StockBalanceRepository;
import com.nammamedmate.server.persistence.StockBatchRepository;
import com.nammamedmate.server.persistence.StockTransferRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.persistence.UserBranchRepository;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Supplier;
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
  private final SalesInvoiceLineRepository salesInvoiceLineRepository;
  private final StockBatchRepository stockBatchRepository;
  private final StockTransferRepository stockTransferRepository;
  private final PurchaseOrderRepository purchaseOrderRepository;
  private final ApprovalRequestRepository approvalRequestRepository;
  private final ComplianceLicenseRepository complianceLicenseRepository;
  private final KycSubmissionRepository kycSubmissionRepository;
  private final TenantRepository tenantRepository;
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
      SalesInvoiceLineRepository salesInvoiceLineRepository,
      StockBatchRepository stockBatchRepository,
      StockTransferRepository stockTransferRepository,
      PurchaseOrderRepository purchaseOrderRepository,
      ApprovalRequestRepository approvalRequestRepository,
      ComplianceLicenseRepository complianceLicenseRepository,
      KycSubmissionRepository kycSubmissionRepository,
      TenantRepository tenantRepository,
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
    this.salesInvoiceLineRepository = salesInvoiceLineRepository;
    this.stockBatchRepository = stockBatchRepository;
    this.stockTransferRepository = stockTransferRepository;
    this.purchaseOrderRepository = purchaseOrderRepository;
    this.approvalRequestRepository = approvalRequestRepository;
    this.complianceLicenseRepository = complianceLicenseRepository;
    this.kycSubmissionRepository = kycSubmissionRepository;
    this.tenantRepository = tenantRepository;
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
              ownerDesk(principal, principal.tenantId(), branchIds, requested, scope, now));
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
                        row.reorderLevel(),
                        null,
                        null))
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
      Instant asOf) {
    List<Location> locations =
        locationRepository.findAllByTenantIdAndDeletedAtIsNullOrderByBranchCodeAsc(tenantId);
    Map<UUID, String> names = new LinkedHashMap<>();
    for (Location location : locations) {
      if (branchIds.contains(location.getId())) {
        names.put(location.getId(), location.getName());
      }
    }
    String branchParam = requested == null ? null : requested.toString();
    DashboardWidget<DashboardView.SalesPayload> sales =
        widget(
            DashboardPolicy.WIDGET_SALES,
            DashboardPolicy.SALES_HREF,
            asOf,
            () -> ownerSales(tenantId, branchIds, names, asOf));
    DashboardWidget<DashboardView.CountItemsPayload<DashboardView.LowStockItem>> lowStock =
        widget(
            DashboardPolicy.WIDGET_LOW_STOCK,
            DashboardPolicy.STOCK_HREF,
            asOf,
            () -> ownerLowStock(tenantId, branchIds, names));
    DashboardWidget<DashboardView.CountItemsPayload<DashboardView.ExpiryItem>> expiry =
        widget(
            DashboardPolicy.WIDGET_EXPIRY,
            DashboardPolicy.STOCK_HREF,
            asOf,
            () -> ownerExpiry(tenantId, branchIds, names, asOf));
    DashboardWidget<DashboardView.CountItemsPayload<DashboardView.WorkItem>> approvals =
        widget(
            DashboardPolicy.WIDGET_APPROVALS,
            DashboardPolicy.APPROVALS_HREF,
            asOf,
            () -> ownerApprovals(tenantId, requested));
    DashboardWidget<DashboardView.AgingPayload> receivables =
        widget(
            DashboardPolicy.WIDGET_RECEIVABLES,
            DashboardPolicy.AGING_HREF,
            asOf,
            () -> agingPayload(agingService.receivables(principal, null, branchParam, scope)));
    DashboardWidget<DashboardView.AgingPayload> payables =
        widget(
            DashboardPolicy.WIDGET_PAYABLES,
            DashboardPolicy.AGING_HREF,
            asOf,
            () -> agingPayload(agingService.payables(principal, null, branchParam, scope)));
    DashboardWidget<DashboardView.CountItemsPayload<DashboardView.TopProductItem>> topProducts =
        widget(
            DashboardPolicy.WIDGET_TOP_PRODUCTS,
            DashboardPolicy.SALES_HREF,
            asOf,
            () -> ownerTopProducts(tenantId, branchIds, asOf));
    DashboardWidget<DashboardView.CountItemsPayload<DashboardView.TransferItem>> transfers =
        widget(
            DashboardPolicy.WIDGET_TRANSFERS,
            DashboardPolicy.TRANSFERS_HREF,
            asOf,
            () -> ownerTransfers(tenantId, branchIds));
    DashboardWidget<DashboardView.CompliancePayload> compliance =
        widget(
            DashboardPolicy.WIDGET_COMPLIANCE,
            DashboardPolicy.LICENSES_HREF,
            asOf,
            () -> ownerCompliance(tenantId, asOf));
    DashboardWidget<DashboardView.CountItemsPayload<DashboardView.WorkItem>> openPurchaseOrders =
        widget(
            DashboardPolicy.WIDGET_OPEN_POS,
            DashboardPolicy.PURCHASES_HREF,
            asOf,
            () -> ownerOpenPurchaseOrders(tenantId, branchIds));
    long expenseTotalPaise = 0L;
    try {
      expenseTotalPaise =
          expenseService.totals(principal, branchParam, scope, null, null, null).totalPaise();
    } catch (RuntimeException ignored) {
      expenseTotalPaise = 0L;
    }
    long todaySalesPaise = sales.data() == null ? 0L : sales.data().todaySalesPaise();
    int todayBillCount = sales.data() == null ? 0 : sales.data().todayBillCount();
    List<DashboardView.BranchSales> branches =
        sales.data() == null ? List.of() : sales.data().branches();
    long ar = receivables.data() == null ? 0L : receivables.data().totalPaise();
    long ap = payables.data() == null ? 0L : payables.data().totalPaise();
    int lowStockCount = lowStock.data() == null ? 0 : lowStock.data().count();
    return new DashboardView.OwnerDesk(
        asOf,
        todaySalesPaise,
        todayBillCount,
        branches,
        ar,
        ap,
        expenseTotalPaise,
        lowStockCount,
        new DashboardView.OwnerSources(
            DashboardPolicy.SALES_HREF,
            DashboardPolicy.STOCK_HREF,
            DashboardPolicy.AGING_HREF,
            DashboardPolicy.EXPENSES_HREF),
        sales,
        lowStock,
        expiry,
        approvals,
        receivables,
        payables,
        topProducts,
        transfers,
        compliance,
        openPurchaseOrders);
  }

  private <T> DashboardWidget<T> widget(String key, String href, Instant asOf, Supplier<T> load) {
    return DashboardWidgets.load(key, asOf, href, load);
  }

  private DashboardView.AgingPayload agingPayload(AgingView view) {
    return new DashboardView.AgingPayload(
        view.totalPaise(),
        view.buckets().stream()
            .map(
                bucket ->
                    new DashboardView.BucketItem(
                        bucket.key().name(), bucket.label(), bucket.totalPaise()))
            .toList());
  }

  private DashboardView.SalesPayload ownerSales(
      UUID tenantId, List<UUID> branchIds, Map<UUID, String> names, Instant asOf) {
    LocalDate day = asOf.atZone(DashboardPolicy.IST).toLocalDate();
    List<SalesInvoice> completed = completedToday(tenantId, branchIds, day);
    Map<UUID, DashboardView.BranchSales> byBranch = new LinkedHashMap<>();
    for (UUID branchId : branchIds) {
      byBranch.put(
          branchId,
          new DashboardView.BranchSales(branchId, names.getOrDefault(branchId, "Outlet"), 0L));
    }
    for (SalesInvoice invoice : completed) {
      DashboardView.BranchSales current =
          byBranch.getOrDefault(
              invoice.getBranchId(),
              new DashboardView.BranchSales(
                  invoice.getBranchId(), names.getOrDefault(invoice.getBranchId(), "Outlet"), 0L));
      byBranch.put(
          invoice.getBranchId(),
          new DashboardView.BranchSales(
              current.id(), current.name(), current.todaySalesPaise() + invoice.getTotalPaise()));
    }
    List<DashboardView.BranchSales> branches = List.copyOf(byBranch.values());
    long totalPaise = branches.stream().mapToLong(DashboardView.BranchSales::todaySalesPaise).sum();
    return new DashboardView.SalesPayload(totalPaise, completed.size(), branches);
  }

  private DashboardView.CountItemsPayload<DashboardView.LowStockItem> ownerLowStock(
      UUID tenantId, List<UUID> branchIds, Map<UUID, String> names) {
    List<DashboardView.LowStockItem> items = new ArrayList<>();
    for (UUID branchId : branchIds) {
      String name = names.getOrDefault(branchId, "Outlet");
      for (InventoryReorderLine line :
          inventoryStockService.listReorderLinesForBranch(tenantId, branchId)) {
        if (line.onHand() == null || line.onHand().signum() <= 0) {
          continue;
        }
        items.add(
            new DashboardView.LowStockItem(
                line.productId(),
                line.sku(),
                line.name(),
                line.onHand(),
                line.reorderLevel(),
                branchId,
                name));
      }
    }
    return new DashboardView.CountItemsPayload<>(items.size(), items);
  }

  private DashboardView.CountItemsPayload<DashboardView.ExpiryItem> ownerExpiry(
      UUID tenantId, List<UUID> branchIds, Map<UUID, String> names, Instant asOf) {
    LocalDate today = asOf.atZone(DashboardPolicy.IST).toLocalDate();
    List<DashboardView.ExpiryItem> items = new ArrayList<>();
    for (UUID branchId : branchIds) {
      int warnDays = expiryWarnDays(tenantId, branchId);
      String name = names.getOrDefault(branchId, "Outlet");
      for (StockBalance balance :
          stockBalanceRepository.findAllByTenantIdAndBranchIdOrderByProductIdAsc(
              tenantId, branchId)) {
        if (balance.getQuantity() == null || balance.getQuantity().signum() <= 0) {
          continue;
        }
        if (balance.getBatchId() == null) {
          continue;
        }
        StockBatch batch =
            stockBatchRepository.findByIdAndTenantId(balance.getBatchId(), tenantId).orElse(null);
        if (batch == null || !DashboardPolicy.isNearExpiry(batch.getExpiresOn(), today, warnDays)) {
          continue;
        }
        Product product =
            productRepository.findByIdAndTenantId(balance.getProductId(), tenantId).orElse(null);
        items.add(
            new DashboardView.ExpiryItem(
                balance.getProductId(),
                product == null ? "" : product.getSku(),
                product == null ? "Stock" : product.getName(),
                batch.getBatchNumber(),
                batch.getExpiresOn(),
                balance.getQuantity(),
                branchId,
                name));
      }
    }
    return new DashboardView.CountItemsPayload<>(items.size(), items);
  }

  private int expiryWarnDays(UUID tenantId, UUID branchId) {
    return locationRepository
        .findByIdAndTenantIdAndDeletedAtIsNull(branchId, tenantId)
        .map(DashboardService::readExpiryWarnDays)
        .orElse(30);
  }

  private static int readExpiryWarnDays(Location branch) {
    Object value =
        branch.getInventorySettings() == null
            ? null
            : branch.getInventorySettings().get("expiryWarnDays");
    if (value instanceof Number number) {
      return Math.max(number.intValue(), 0);
    }
    return 30;
  }

  private DashboardView.CountItemsPayload<DashboardView.WorkItem> ownerApprovals(
      UUID tenantId, UUID requested) {
    List<DashboardView.WorkItem> items = new ArrayList<>();
    for (ApprovalRequest request :
        approvalRequestRepository.findByTenantIdAndStatusOrderByCreatedAtAsc(
            tenantId, ApprovalRequestStatus.PENDING)) {
      if (requested != null
          && request.getBranchId() != null
          && !requested.equals(request.getBranchId())) {
        continue;
      }
      items.add(
          new DashboardView.WorkItem(
              request.getId(),
              request.getActionKey().name(),
              request.getStatus().name(),
              DashboardPolicy.APPROVALS_HREF));
    }
    return new DashboardView.CountItemsPayload<>(items.size(), items);
  }

  private DashboardView.CountItemsPayload<DashboardView.TopProductItem> ownerTopProducts(
      UUID tenantId, List<UUID> branchIds, Instant asOf) {
    LocalDate day = asOf.atZone(DashboardPolicy.IST).toLocalDate();
    List<SalesInvoice> completed = completedToday(tenantId, branchIds, day);
    List<UUID> invoiceIds = completed.stream().map(SalesInvoice::getId).toList();
    Map<UUID, Acc> totals = new LinkedHashMap<>();
    if (!invoiceIds.isEmpty()) {
      for (SalesInvoiceLine line :
          salesInvoiceLineRepository.findAllByTenantIdAndSalesInvoiceIdIn(tenantId, invoiceIds)) {
        Acc acc = totals.computeIfAbsent(line.getProductId(), ignored -> new Acc(line));
        acc.add(line);
      }
    }
    List<DashboardView.TopProductItem> ranked = new ArrayList<>();
    for (Acc acc : totals.values()) {
      ranked.add(acc.toItem());
    }
    ranked.sort((left, right) -> Long.compare(right.salesPaise(), left.salesPaise()));
    if (ranked.size() > DashboardPolicy.TOP_PRODUCTS_LIMIT) {
      ranked = new ArrayList<>(ranked.subList(0, DashboardPolicy.TOP_PRODUCTS_LIMIT));
    }
    return new DashboardView.CountItemsPayload<>(ranked.size(), List.copyOf(ranked));
  }

  private DashboardView.CountItemsPayload<DashboardView.TransferItem> ownerTransfers(
      UUID tenantId, List<UUID> branchIds) {
    Map<UUID, DashboardView.TransferItem> unique = new LinkedHashMap<>();
    for (UUID branchId : branchIds) {
      for (StockTransfer transfer : stockTransferRepository.findAllForBranch(tenantId, branchId)) {
        if (transfer.getStatus() != StockTransferStatus.REQUESTED
            && transfer.getStatus() != StockTransferStatus.IN_TRANSIT) {
          continue;
        }
        unique.putIfAbsent(
            transfer.getId(),
            new DashboardView.TransferItem(
                transfer.getId(),
                transfer.getStatus().name(),
                transfer.getDirection().name(),
                DashboardPolicy.TRANSFERS_HREF));
      }
    }
    List<DashboardView.TransferItem> items = List.copyOf(unique.values());
    return new DashboardView.CountItemsPayload<>(items.size(), items);
  }

  private DashboardView.CompliancePayload ownerCompliance(UUID tenantId, Instant asOf) {
    LocalDate today = asOf.atZone(DashboardPolicy.IST).toLocalDate();
    Tenant tenant = tenantRepository.findById(tenantId).orElse(null);
    String tenantStatus = tenant == null ? "UNKNOWN" : tenant.getStatus().name();
    KycSubmission latest =
        kycSubmissionRepository.findFirstByTenantIdOrderBySubmittedAtDesc(tenantId).orElse(null);
    String kycStatus = latest == null ? "NONE" : latest.getStatus().name();
    List<DashboardView.LicenseDueItem> due = new ArrayList<>();
    for (ComplianceLicense license :
        complianceLicenseRepository.findAllByTenantIdOrderByExpiresOnAsc(tenantId)) {
      if (!DashboardPolicy.isDue(license.getExpiresOn(), today)) {
        continue;
      }
      due.add(
          new DashboardView.LicenseDueItem(
              license.getId(),
              license.getDocType().name(),
              license.getExpiresOn(),
              license.getBranchId(),
              DashboardPolicy.LICENSES_HREF));
    }
    return new DashboardView.CompliancePayload(tenantStatus, kycStatus, due.size(), due);
  }

  private DashboardView.CountItemsPayload<DashboardView.WorkItem> ownerOpenPurchaseOrders(
      UUID tenantId, List<UUID> branchIds) {
    List<DashboardView.WorkItem> items = new ArrayList<>();
    for (UUID branchId : branchIds) {
      for (PurchaseOrder order :
          purchaseOrderRepository.findByTenantIdAndBranchIdOrderByCreatedAtDesc(
              tenantId, branchId)) {
        if (order.getStatus() != PurchaseOrderStatus.DRAFT
            && order.getStatus() != PurchaseOrderStatus.ISSUED) {
          continue;
        }
        items.add(
            new DashboardView.WorkItem(
                order.getId(),
                order.getPoNumber(),
                order.getStatus().name(),
                DashboardPolicy.PURCHASES_HREF));
      }
    }
    return new DashboardView.CountItemsPayload<>(items.size(), items);
  }

  private List<SalesInvoice> completedToday(UUID tenantId, List<UUID> branchIds, LocalDate asOf) {
    Instant from = DashboardPolicy.startOfDay(asOf);
    Instant to = DashboardPolicy.startOfDay(asOf.plusDays(1));
    return salesInvoiceRepository.findCompletedInWindow(
        tenantId, branchIds, SalesInvoiceStatus.COMPLETED, from, to);
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

  private static final class Acc {
    private final UUID productId;
    private final String sku;
    private final String productName;
    private BigDecimal quantity;
    private long salesPaise;

    private Acc(SalesInvoiceLine line) {
      this.productId = line.getProductId();
      this.sku = line.getSku();
      this.productName = line.getProductName();
      this.quantity = BigDecimal.ZERO;
      this.salesPaise = 0L;
    }

    private void add(SalesInvoiceLine line) {
      quantity = quantity.add(line.getQuantity());
      salesPaise += line.getLineTotalPaise();
    }

    private DashboardView.TopProductItem toItem() {
      return new DashboardView.TopProductItem(productId, sku, productName, quantity, salesPaise);
    }
  }
}
