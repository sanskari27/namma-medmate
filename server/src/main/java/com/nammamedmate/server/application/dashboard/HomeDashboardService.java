package com.nammamedmate.server.application.dashboard;

import com.nammamedmate.server.application.access.AccessQueryService;
import com.nammamedmate.server.application.finance.AgingService;
import com.nammamedmate.server.application.finance.AgingView;
import com.nammamedmate.server.application.subscription.SubscriptionService;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.Customer;
import com.nammamedmate.server.domain.DashboardPolicy;
import com.nammamedmate.server.domain.DashboardRole;
import com.nammamedmate.server.domain.FinanceAccessPolicy;
import com.nammamedmate.server.domain.GoodsReceipt;
import com.nammamedmate.server.domain.GoodsReceiptStatus;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.ModuleCode;
import com.nammamedmate.server.domain.PaymentMode;
import com.nammamedmate.server.domain.PrescriptionReference;
import com.nammamedmate.server.domain.PrescriptionReferenceStatus;
import com.nammamedmate.server.domain.Product;
import com.nammamedmate.server.domain.ProductCategory;
import com.nammamedmate.server.domain.ReportAccessPolicy;
import com.nammamedmate.server.domain.ReportCapability;
import com.nammamedmate.server.domain.SalesInvoice;
import com.nammamedmate.server.domain.SalesInvoiceLine;
import com.nammamedmate.server.domain.SalesInvoicePayment;
import com.nammamedmate.server.domain.SalesInvoiceStatus;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.CustomerRepository;
import com.nammamedmate.server.persistence.GoodsReceiptRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.PrescriptionReferenceRepository;
import com.nammamedmate.server.persistence.ProductCategoryRepository;
import com.nammamedmate.server.persistence.ProductRepository;
import com.nammamedmate.server.persistence.SalesInvoiceLineRepository;
import com.nammamedmate.server.persistence.SalesInvoicePaymentRepository;
import com.nammamedmate.server.persistence.SalesInvoiceRepository;
import com.nammamedmate.server.persistence.UserBranchRepository;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class HomeDashboardService {

  private static final int TOP_CATEGORIES_LIMIT = 5;
  private static final int TOP_SELLERS_LIMIT = 5;
  private static final int ATTENTION_LIMIT = 6;
  private static final int EXPIRING_LIMIT = 5;
  private static final int RECENT_LIMIT = 8;

  private final AppUserRepository appUserRepository;
  private final AccessQueryService accessQueryService;
  private final DashboardService dashboardService;
  private final SalesInvoiceRepository salesInvoiceRepository;
  private final SalesInvoiceLineRepository salesInvoiceLineRepository;
  private final SalesInvoicePaymentRepository salesInvoicePaymentRepository;
  private final PrescriptionReferenceRepository prescriptionReferenceRepository;
  private final ProductRepository productRepository;
  private final ProductCategoryRepository productCategoryRepository;
  private final CustomerRepository customerRepository;
  private final GoodsReceiptRepository goodsReceiptRepository;
  private final LocationRepository locationRepository;
  private final UserBranchRepository userBranchRepository;
  private final AgingService agingService;
  private final SubscriptionService subscriptionService;
  private final Clock clock;

  public HomeDashboardService(
      AppUserRepository appUserRepository,
      AccessQueryService accessQueryService,
      DashboardService dashboardService,
      SalesInvoiceRepository salesInvoiceRepository,
      SalesInvoiceLineRepository salesInvoiceLineRepository,
      SalesInvoicePaymentRepository salesInvoicePaymentRepository,
      PrescriptionReferenceRepository prescriptionReferenceRepository,
      ProductRepository productRepository,
      ProductCategoryRepository productCategoryRepository,
      CustomerRepository customerRepository,
      GoodsReceiptRepository goodsReceiptRepository,
      LocationRepository locationRepository,
      UserBranchRepository userBranchRepository,
      AgingService agingService,
      SubscriptionService subscriptionService,
      Clock clock) {
    this.appUserRepository = appUserRepository;
    this.accessQueryService = accessQueryService;
    this.dashboardService = dashboardService;
    this.salesInvoiceRepository = salesInvoiceRepository;
    this.salesInvoiceLineRepository = salesInvoiceLineRepository;
    this.salesInvoicePaymentRepository = salesInvoicePaymentRepository;
    this.prescriptionReferenceRepository = prescriptionReferenceRepository;
    this.productRepository = productRepository;
    this.productCategoryRepository = productCategoryRepository;
    this.customerRepository = customerRepository;
    this.goodsReceiptRepository = goodsReceiptRepository;
    this.locationRepository = locationRepository;
    this.userBranchRepository = userBranchRepository;
    this.agingService = agingService;
    this.subscriptionService = subscriptionService;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public HomeDashboardView open(AuthPrincipal principal, String periodRaw) {
    AppUser user = requireUser(principal);
    Set<ModuleCode> modules = accessQueryService.effectiveModules(user);
    boolean accountantDesk =
        accessQueryService.hasAssignedRoleCode(user, FinanceAccessPolicy.ACCOUNTANT_CODE);
    List<DashboardRole> desks = DashboardPolicy.permitted(user.getRole(), modules, accountantDesk);
    if (desks.isEmpty()) {
      throw DashboardPolicy.forbidden();
    }
    UUID tenantId = principal.tenantId();
    ResolvedScope resolved = resolveScope(principal, user);
    Instant now = clock.instant();
    LocalDate asOf = DashboardPolicy.today(now);
    String period = normalizePeriod(periodRaw);
    LocalDate periodFrom = periodFrom(asOf, period);

    DashboardView.OwnerDesk owner = null;
    if (desks.contains(DashboardRole.OWNER)) {
      String ownerBranchParam =
          resolved.primaryBranchId() == null ? null : resolved.primaryBranchId().toString();
      DashboardView ownerView =
          dashboardService.open(principal, "owner", ownerBranchParam, resolved.scope());
      owner = ownerView.owner();
      if (owner == null) {
        throw DashboardPolicy.forbidden();
      }
    }

    List<UUID> branchIds = resolved.branchIds();
    List<SalesInvoice> todayCompleted =
        completedInWindow(tenantId, branchIds, asOf, asOf.plusDays(1));
    List<SalesInvoice> monthCompleted =
        completedInWindow(tenantId, branchIds, asOf.withDayOfMonth(1), asOf.plusDays(1));
    List<SalesInvoice> periodCompleted =
        completedInWindow(tenantId, branchIds, periodFrom, asOf.plusDays(1));

    long monthSales = sumSales(monthCompleted);
    long todaySales = sumSales(todayCompleted);
    int todayBills = todayCompleted.size();
    List<SalesInvoice> yesterdayCompleted =
        completedInWindow(tenantId, branchIds, asOf.minusDays(1), asOf);
    long yesterdaySales = sumSales(yesterdayCompleted);
    long todayOnlineSales = 0L;
    long todayCounterSales = todaySales;
    long itemsSoldToday = unitsSold(tenantId, todayCompleted);
    long avgBillToday = todayBills == 0 ? 0L : todaySales / todayBills;

    ReceivableSnapshot receivables;
    if (desks.contains(DashboardRole.OWNER) || desks.contains(DashboardRole.ACCOUNTANT)) {
      receivables = receivables(principal, resolved);
    } else {
      receivables = new ReceivableSnapshot(0L, 0);
    }
    int pendingPrescriptions = pendingPrescriptions(tenantId, branchIds);
    int lowStockCount = owner == null ? 0 : owner.lowStockCount();
    int expiringCount = expiryCount(owner);
    int stockAlerts = lowStockCount + expiringCount;

    int heldCount = heldCount(tenantId, branchIds);

    HomeDashboardView.HeroMetrics hero =
        new HomeDashboardView.HeroMetrics(
            monthSales,
            avgBillToday,
            itemsSoldToday,
            receivables.totalPaise(),
            receivables.customerCount());

    HomeDashboardView.QuickActionCounts quickActions =
        new HomeDashboardView.QuickActionCounts(
            pendingPrescriptions,
            lowStockCount,
            approvalCount(owner),
            pendingGrn(tenantId, branchIds));

    HomeDashboardView.KpiCards kpis =
        new HomeDashboardView.KpiCards(
            todaySales,
            todayBills,
            todayOnlineSales,
            todayCounterSales,
            yesterdaySales,
            pendingPrescriptions,
            stockAlerts,
            lowStockCount,
            expiringCount,
            heldCount,
            heldCount);

    HomeDashboardView.AnalyticsPanel analytics =
        analyticsPanel(tenantId, period, periodFrom, asOf, periodCompleted);

    List<HomeDashboardView.AttentionItem> attention = attentionItems(owner, pendingPrescriptions);
    List<DashboardView.ExpiryItem> expiringSoon = withCategoryIcons(tenantId, expiringItems(owner));
    List<DashboardView.TopProductItem> topSellers =
        withTopSellerIcons(tenantId, topSellers(tenantId, branchIds, periodFrom, asOf));
    List<HomeDashboardView.RecentTransaction> recent = recentTransactions(tenantId, branchIds);

    return new HomeDashboardView(
        asOf,
        now,
        resolved.scope(),
        resolved.primaryBranchId(),
        resolved.branchName(),
        hero,
        quickActions,
        kpis,
        analytics,
        attention,
        expiringSoon,
        topSellers,
        recent);
  }

  private ResolvedScope resolveScope(AuthPrincipal principal, AppUser user) {
    UUID tenantId = principal.tenantId();
    UUID active = principal.activeBranchId();
    if (active != null) {
      requireAccessibleBranch(principal, user, tenantId, active);
      return new ResolvedScope(
          DashboardPolicy.SCOPE_BRANCH,
          active,
          List.of(active),
          dashboardService.branchName(tenantId, active));
    }
    if (user.getRole() == AppUserRole.pharmacy_owner) {
      List<UUID> branchIds =
          locationRepository
              .findAllByTenantIdAndDeletedAtIsNullOrderByBranchCodeAsc(tenantId)
              .stream()
              .map(Location::getId)
              .toList();
      if (branchIds.isEmpty()) {
        throw DashboardPolicy.notFound();
      }
      return new ResolvedScope(DashboardPolicy.SCOPE_TENANT, null, branchIds, "All outlets");
    }
    throw DashboardPolicy.noActiveBranch();
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

  private HomeDashboardView.AnalyticsPanel analyticsPanel(
      UUID tenantId,
      String period,
      LocalDate from,
      LocalDate toInclusive,
      List<SalesInvoice> invoices) {
    long totalSales = sumSales(invoices);
    int totalBills = invoices.size();
    List<UUID> invoiceIds = invoices.stream().map(SalesInvoice::getId).toList();

    long counterSales = totalSales;
    List<HomeDashboardView.ChannelSlice> channelSplit =
        List.of(
            new HomeDashboardView.ChannelSlice("ONLINE", "Online", 0L, 0),
            new HomeDashboardView.ChannelSlice(
                "COUNTER", "Counter sale", counterSales, totalBills));

    Map<PaymentMode, Long> byMode = new LinkedHashMap<>();
    if (!invoiceIds.isEmpty()) {
      for (SalesInvoicePayment payment :
          salesInvoicePaymentRepository.findAllByTenantIdAndSalesInvoiceIdIn(
              tenantId, invoiceIds)) {
        byMode.merge(payment.getMode(), payment.getAmountPaise(), Long::sum);
      }
    }
    List<HomeDashboardView.PaymentSlice> paymentModes = new ArrayList<>();
    for (PaymentMode mode : PaymentMode.values()) {
      long amount = byMode.getOrDefault(mode, 0L);
      if (amount > 0) {
        paymentModes.add(
            new HomeDashboardView.PaymentSlice(mode.name(), paymentLabel(mode), amount));
      }
    }

    List<HomeDashboardView.CategorySlice> topCategories =
        topCategories(tenantId, invoiceIds, invoices);

    List<HomeDashboardView.TrendPoint> trend = trendPoints(from, toInclusive, invoices);

    return new HomeDashboardView.AnalyticsPanel(
        period, totalSales, totalBills, channelSplit, paymentModes, topCategories, trend);
  }

  private List<HomeDashboardView.TrendPoint> trendPoints(
      LocalDate from, LocalDate toInclusive, List<SalesInvoice> invoices) {
    Map<LocalDate, AccTrend> byDay = new LinkedHashMap<>();
    for (LocalDate day = from; !day.isAfter(toInclusive); day = day.plusDays(1)) {
      byDay.put(day, new AccTrend());
    }
    for (SalesInvoice invoice : invoices) {
      if (invoice.getCompletedAt() == null) {
        continue;
      }
      LocalDate day = invoice.getCompletedAt().atZone(DashboardPolicy.IST).toLocalDate();
      AccTrend acc = byDay.get(day);
      if (acc == null) {
        continue;
      }
      acc.add(invoice.getTotalPaise());
    }
    List<HomeDashboardView.TrendPoint> points = new ArrayList<>();
    for (Map.Entry<LocalDate, AccTrend> entry : byDay.entrySet()) {
      points.add(
          new HomeDashboardView.TrendPoint(
              entry.getKey().toString(), entry.getValue().salesPaise, entry.getValue().billCount));
    }
    return points;
  }

  private List<HomeDashboardView.CategorySlice> topCategories(
      UUID tenantId, List<UUID> invoiceIds, List<SalesInvoice> invoices) {
    if (invoiceIds.isEmpty()) {
      return List.of();
    }
    Map<UUID, Long> byCategory = new LinkedHashMap<>();
    for (SalesInvoiceLine line :
        salesInvoiceLineRepository.findAllByTenantIdAndSalesInvoiceIdIn(tenantId, invoiceIds)) {
      Product product =
          productRepository.findByIdAndTenantId(line.getProductId(), tenantId).orElse(null);
      if (product == null) {
        continue;
      }
      byCategory.merge(product.getCategoryId(), line.getLineTotalPaise(), Long::sum);
    }
    List<Map.Entry<UUID, Long>> ranked = new ArrayList<>(byCategory.entrySet());
    ranked.sort(Map.Entry.<UUID, Long>comparingByValue().reversed());
    if (ranked.size() > TOP_CATEGORIES_LIMIT) {
      ranked = ranked.subList(0, TOP_CATEGORIES_LIMIT);
    }
    Map<UUID, ProductCategory> categories = new LinkedHashMap<>();
    for (ProductCategory category :
        productCategoryRepository.findAllByTenantIdOrderByNameAsc(tenantId)) {
      categories.put(category.getId(), category);
    }
    List<HomeDashboardView.CategorySlice> slices = new ArrayList<>();
    for (Map.Entry<UUID, Long> entry : ranked) {
      ProductCategory category = categories.get(entry.getKey());
      slices.add(
          new HomeDashboardView.CategorySlice(
              entry.getKey(),
              category == null ? "Uncategorised" : category.getName(),
              category == null ? null : category.getIcon(),
              entry.getValue()));
    }
    return slices;
  }

  private List<DashboardView.TopProductItem> topSellers(
      UUID tenantId, List<UUID> branchIds, LocalDate from, LocalDate toInclusive) {
    List<SalesInvoice> invoices =
        completedInWindow(tenantId, branchIds, from, toInclusive.plusDays(1));
    List<UUID> invoiceIds = invoices.stream().map(SalesInvoice::getId).toList();
    if (invoiceIds.isEmpty()) {
      return List.of();
    }
    Map<UUID, AccProduct> totals = new LinkedHashMap<>();
    for (SalesInvoiceLine line :
        salesInvoiceLineRepository.findAllByTenantIdAndSalesInvoiceIdIn(tenantId, invoiceIds)) {
      totals.computeIfAbsent(line.getProductId(), id -> new AccProduct(line)).add(line);
    }
    List<DashboardView.TopProductItem> ranked = new ArrayList<>();
    for (AccProduct acc : totals.values()) {
      ranked.add(acc.toItem());
    }
    ranked.sort(Comparator.comparingLong(DashboardView.TopProductItem::salesPaise).reversed());
    if (ranked.size() > TOP_SELLERS_LIMIT) {
      ranked = ranked.subList(0, TOP_SELLERS_LIMIT);
    }
    return List.copyOf(ranked);
  }

  private List<HomeDashboardView.RecentTransaction> recentTransactions(
      UUID tenantId, List<UUID> branchIds) {
    List<HomeDashboardView.RecentTransaction> recent = new ArrayList<>();
    for (UUID branchId : branchIds) {
      for (SalesInvoice invoice :
          salesInvoiceRepository.findByTenantIdAndBranchIdOrderByCreatedAtDesc(
              tenantId, branchId)) {
        if (invoice.getStatus() != SalesInvoiceStatus.COMPLETED
            || invoice.getCompletedAt() == null) {
          continue;
        }
        recent.add(
            new HomeDashboardView.RecentTransaction(
                invoice.getId(),
                invoice.getInvoiceNumber(),
                invoice.getTotalPaise(),
                invoice.getCompletedAt(),
                customerLabel(tenantId, invoice.getCustomerId())));
      }
    }
    recent.sort(Comparator.comparing(HomeDashboardView.RecentTransaction::completedAt).reversed());
    if (recent.size() > RECENT_LIMIT) {
      return List.copyOf(recent.subList(0, RECENT_LIMIT));
    }
    return recent;
  }

  private List<HomeDashboardView.AttentionItem> attentionItems(
      DashboardView.OwnerDesk owner, int pendingPrescriptions) {
    List<HomeDashboardView.AttentionItem> items = new ArrayList<>();
    if (pendingPrescriptions > 0) {
      items.add(
          new HomeDashboardView.AttentionItem(
              "rx-pending",
              "PRESCRIPTION",
              pendingPrescriptions + " prescriptions pending review",
              "Verify before dispensing scheduled medicines.",
              DashboardPolicy.PRESCRIPTIONS_HREF,
              "Review"));
    }
    if (owner == null) {
      return items;
    }
    DashboardWidget<DashboardView.CountItemsPayload<DashboardView.LowStockItem>> lowStock =
        owner.lowStock();
    if (lowStock != null && lowStock.data() != null) {
      for (DashboardView.LowStockItem row :
          lowStock.data().items().stream().limit(ATTENTION_LIMIT).toList()) {
        items.add(
            new HomeDashboardView.AttentionItem(
                row.productId().toString(),
                "LOW_STOCK",
                row.productName(),
                "On hand " + row.onHand() + " · reorder " + row.reorderLevel(),
                DashboardPolicy.STOCK_HREF,
                "Restock"));
        if (items.size() >= ATTENTION_LIMIT) {
          return items;
        }
      }
    }
    DashboardWidget<DashboardView.CountItemsPayload<DashboardView.WorkItem>> approvals =
        owner.approvals();
    if (approvals != null && approvals.data() != null) {
      for (DashboardView.WorkItem row : approvals.data().items()) {
        items.add(
            new HomeDashboardView.AttentionItem(
                row.id().toString(),
                "APPROVAL",
                row.label(),
                row.status(),
                DashboardPolicy.APPROVALS_HREF,
                "Verify"));
        if (items.size() >= ATTENTION_LIMIT) {
          break;
        }
      }
    }
    return items;
  }

  private List<DashboardView.ExpiryItem> withCategoryIcons(
      UUID tenantId, List<DashboardView.ExpiryItem> items) {
    if (items.isEmpty()) {
      return items;
    }
    Map<UUID, String> icons = categoryIconByProduct(tenantId);
    return items.stream()
        .map(
            item ->
                new DashboardView.ExpiryItem(
                    item.productId(),
                    item.sku(),
                    item.productName(),
                    item.batchNumber(),
                    item.expiresOn(),
                    item.quantity(),
                    item.branchId(),
                    item.branchName(),
                    icons.get(item.productId())))
        .toList();
  }

  private List<DashboardView.TopProductItem> withTopSellerIcons(
      UUID tenantId, List<DashboardView.TopProductItem> items) {
    if (items.isEmpty()) {
      return items;
    }
    Map<UUID, String> icons = categoryIconByProduct(tenantId);
    return items.stream()
        .map(
            item ->
                new DashboardView.TopProductItem(
                    item.productId(),
                    item.sku(),
                    item.productName(),
                    item.quantity(),
                    item.salesPaise(),
                    icons.get(item.productId())))
        .toList();
  }

  private Map<UUID, String> categoryIconByProduct(UUID tenantId) {
    Map<UUID, String> categoryIcons = new LinkedHashMap<>();
    for (ProductCategory category :
        productCategoryRepository.findAllByTenantIdOrderByNameAsc(tenantId)) {
      categoryIcons.put(category.getId(), category.getIcon());
    }
    Map<UUID, String> byProduct = new LinkedHashMap<>();
    for (Product product : productRepository.findAllByTenantIdOrderByNameAsc(tenantId)) {
      byProduct.put(product.getId(), categoryIcons.get(product.getCategoryId()));
    }
    return byProduct;
  }

  private List<DashboardView.ExpiryItem> expiringItems(DashboardView.OwnerDesk owner) {
    if (owner == null) {
      return List.of();
    }
    DashboardWidget<DashboardView.CountItemsPayload<DashboardView.ExpiryItem>> expiry =
        owner.expiry();
    if (expiry == null || expiry.data() == null) {
      return List.of();
    }
    List<DashboardView.ExpiryItem> items = expiry.data().items();
    if (items.size() <= EXPIRING_LIMIT) {
      return items;
    }
    return List.copyOf(items.subList(0, EXPIRING_LIMIT));
  }

  private int pendingPrescriptions(UUID tenantId, List<UUID> branchIds) {
    int count = 0;
    for (PrescriptionReference row :
        prescriptionReferenceRepository.findByTenantIdAndStatusOrderByIssuedAtDesc(
            tenantId, PrescriptionReferenceStatus.ACTIVE)) {
      if (branchIds.contains(row.getBranchId())) {
        count++;
      }
    }
    return count;
  }

  private int heldCount(UUID tenantId, List<UUID> branchIds) {
    int count = 0;
    for (UUID branchId : branchIds) {
      count +=
          salesInvoiceRepository
              .findByTenantIdAndBranchIdAndStatusOrderByCreatedAtDesc(
                  tenantId, branchId, SalesInvoiceStatus.HELD)
              .size();
    }
    return count;
  }

  private int pendingGrn(UUID tenantId, List<UUID> branchIds) {
    return ownerOpenGrnCount(tenantId, branchIds);
  }

  private int ownerOpenGrnCount(UUID tenantId, List<UUID> branchIds) {
    int count = 0;
    for (UUID branchId : branchIds) {
      for (GoodsReceipt receipt :
          goodsReceiptRepository.findAllByTenantIdAndBranchIdOrderByCreatedAtDesc(
              tenantId, branchId)) {
        if (receipt.getStatus() == GoodsReceiptStatus.PENDING_QC) {
          count++;
        }
      }
    }
    return count;
  }

  private int approvalCount(DashboardView.OwnerDesk owner) {
    if (owner == null) {
      return 0;
    }
    DashboardWidget<DashboardView.CountItemsPayload<DashboardView.WorkItem>> approvals =
        owner.approvals();
    if (approvals == null || approvals.data() == null) {
      return 0;
    }
    return approvals.data().count();
  }

  private int expiryCount(DashboardView.OwnerDesk owner) {
    if (owner == null) {
      return 0;
    }
    DashboardWidget<DashboardView.CountItemsPayload<DashboardView.ExpiryItem>> expiry =
        owner.expiry();
    if (expiry == null || expiry.data() == null) {
      return 0;
    }
    return expiry.data().count();
  }

  private ReceivableSnapshot receivables(AuthPrincipal principal, ResolvedScope resolved) {
    if (!ReportAccessPolicy.entitled(
        subscriptionService.resolveReportPlan(principal.tenantId()), ReportCapability.AGING)) {
      return new ReceivableSnapshot(0L, 0);
    }
    try {
      String branchParam =
          resolved.primaryBranchId() == null ? null : resolved.primaryBranchId().toString();
      AgingView view = agingService.receivables(principal, null, branchParam, resolved.scope());
      int customers =
          (int) view.buckets().stream().filter(bucket -> bucket.totalPaise() > 0).count();
      return new ReceivableSnapshot(view.totalPaise(), customers);
    } catch (RuntimeException ex) {
      return new ReceivableSnapshot(0L, 0);
    }
  }

  private long unitsSold(UUID tenantId, List<SalesInvoice> invoices) {
    List<UUID> ids = invoices.stream().map(SalesInvoice::getId).toList();
    if (ids.isEmpty()) {
      return 0L;
    }
    long units = 0L;
    for (SalesInvoiceLine line :
        salesInvoiceLineRepository.findAllByTenantIdAndSalesInvoiceIdIn(tenantId, ids)) {
      units += unitsOf(line.getQuantity());
    }
    return units;
  }

  private List<SalesInvoice> completedInWindow(
      UUID tenantId, List<UUID> branchIds, LocalDate from, LocalDate toExclusive) {
    if (branchIds.isEmpty()) {
      return List.of();
    }
    return salesInvoiceRepository.findCompletedInWindow(
        tenantId,
        branchIds,
        SalesInvoiceStatus.COMPLETED,
        DashboardPolicy.startOfDay(from),
        DashboardPolicy.startOfDay(toExclusive));
  }

  private long sumSales(List<SalesInvoice> invoices) {
    return invoices.stream().mapToLong(SalesInvoice::getTotalPaise).sum();
  }

  private String customerLabel(UUID tenantId, UUID customerId) {
    if (customerId == null) {
      return "Walk-in";
    }
    return customerRepository
        .findByIdAndTenantId(customerId, tenantId)
        .map(Customer::getName)
        .orElse("Customer");
  }

  private static long unitsOf(BigDecimal quantity) {
    if (quantity == null) {
      return 0L;
    }
    return quantity.longValue();
  }

  private static String paymentLabel(PaymentMode mode) {
    return switch (mode) {
      case CASH -> "Cash";
      case UPI -> "UPI";
      case CARD -> "Card";
      case BANK_TRANSFER -> "Bank transfer";
      case CREDIT -> "Khata / credit";
    };
  }

  private static String normalizePeriod(String raw) {
    if (raw == null || raw.isBlank()) {
      return "7D";
    }
    String period = raw.trim().toUpperCase(Locale.ROOT);
    if ("7D".equals(period) || "30D".equals(period) || "12M".equals(period)) {
      return period;
    }
    throw DashboardPolicy.shape();
  }

  private static LocalDate periodFrom(LocalDate asOf, String period) {
    return switch (period) {
      case "30D" -> asOf.minusDays(29);
      case "12M" -> asOf.minusMonths(11).withDayOfMonth(1);
      default -> asOf.minusDays(6);
    };
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

  private record ReceivableSnapshot(long totalPaise, int customerCount) {}

  private record ResolvedScope(
      String scope, UUID primaryBranchId, List<UUID> branchIds, String branchName) {}

  private static final class AccTrend {
    private long salesPaise;
    private int billCount;

    private void add(long sales) {
      salesPaise += sales;
      billCount++;
    }
  }

  private static final class AccProduct {
    private final UUID productId;
    private final String sku;
    private final String productName;
    private BigDecimal quantity = BigDecimal.ZERO;
    private long salesPaise;

    private AccProduct(SalesInvoiceLine line) {
      this.productId = line.getProductId();
      this.sku = line.getSku();
      this.productName = line.getProductName();
    }

    private static AccProduct fromLine(SalesInvoiceLine line) {
      return new AccProduct(line);
    }

    private void add(SalesInvoiceLine line) {
      quantity = quantity.add(line.getQuantity());
      salesPaise += line.getLineTotalPaise();
    }

    private DashboardView.TopProductItem toItem() {
      return new DashboardView.TopProductItem(
          productId, sku, productName, quantity, salesPaise, null);
    }
  }
}
