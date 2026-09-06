package com.nammamedmate.server.application.analytics;

import com.nammamedmate.server.application.access.AccessQueryService;
import com.nammamedmate.server.application.subscription.SubscriptionService;
import com.nammamedmate.server.domain.AnalyticsCompare;
import com.nammamedmate.server.domain.AnalyticsPolicy;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.ModuleCode;
import com.nammamedmate.server.domain.Product;
import com.nammamedmate.server.domain.SalesInvoice;
import com.nammamedmate.server.domain.SalesInvoiceLine;
import com.nammamedmate.server.domain.SalesInvoiceStatus;
import com.nammamedmate.server.domain.StockBalance;
import com.nammamedmate.server.domain.StockMovement;
import com.nammamedmate.server.domain.StockMovementType;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.ProductRepository;
import com.nammamedmate.server.persistence.SalesInvoiceLineRepository;
import com.nammamedmate.server.persistence.SalesInvoiceRepository;
import com.nammamedmate.server.persistence.StockBalanceRepository;
import com.nammamedmate.server.persistence.StockMovementRepository;
import com.nammamedmate.server.persistence.UserBranchRepository;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AnalyticsService {

  private final AppUserRepository appUserRepository;
  private final AccessQueryService accessQueryService;
  private final SubscriptionService subscriptionService;
  private final LocationRepository locationRepository;
  private final UserBranchRepository userBranchRepository;
  private final SalesInvoiceRepository salesInvoiceRepository;
  private final SalesInvoiceLineRepository salesInvoiceLineRepository;
  private final StockMovementRepository stockMovementRepository;
  private final StockBalanceRepository stockBalanceRepository;
  private final ProductRepository productRepository;
  private final Clock clock;

  public AnalyticsService(
      AppUserRepository appUserRepository,
      AccessQueryService accessQueryService,
      SubscriptionService subscriptionService,
      LocationRepository locationRepository,
      UserBranchRepository userBranchRepository,
      SalesInvoiceRepository salesInvoiceRepository,
      SalesInvoiceLineRepository salesInvoiceLineRepository,
      StockMovementRepository stockMovementRepository,
      StockBalanceRepository stockBalanceRepository,
      ProductRepository productRepository,
      Clock clock) {
    this.appUserRepository = appUserRepository;
    this.accessQueryService = accessQueryService;
    this.subscriptionService = subscriptionService;
    this.locationRepository = locationRepository;
    this.userBranchRepository = userBranchRepository;
    this.salesInvoiceRepository = salesInvoiceRepository;
    this.salesInvoiceLineRepository = salesInvoiceLineRepository;
    this.stockMovementRepository = stockMovementRepository;
    this.stockBalanceRepository = stockBalanceRepository;
    this.productRepository = productRepository;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public AnalyticsView open(
      AuthPrincipal principal,
      String compareRaw,
      LocalDate from,
      LocalDate to,
      LocalDate priorFrom,
      LocalDate priorTo,
      String branchIdRaw,
      String scopeRaw,
      Integer limitRaw) {
    if (principal == null || principal.tenantId() == null) {
      throw AnalyticsPolicy.forbidden();
    }
    AppUser user = requireUser(principal);
    Set<ModuleCode> modules = accessQueryService.effectiveModules(user);
    AnalyticsPolicy.requireAccess(user.getRole(), modules);
    AnalyticsPolicy.assertEntitled(subscriptionService.resolvePlan(principal.tenantId()));
    AnalyticsCompare compare = AnalyticsPolicy.requireCompare(compareRaw);
    String scope = AnalyticsPolicy.requireScope(user.getRole(), scopeRaw);
    int limit = AnalyticsPolicy.requireLimit(limitRaw);
    AnalyticsPolicy.Window window =
        AnalyticsPolicy.resolve(compareRaw, from, to, priorFrom, priorTo, clock.instant());
    UUID requested = parseUuid(branchIdRaw);
    List<UUID> branchIds = resolveBranches(principal, user, requested, scope);
    UUID primary = AnalyticsPolicy.SCOPE_TENANT.equals(scope) ? null : branchIds.get(0);
    String branchName = primary == null ? null : branchName(principal.tenantId(), primary);

    List<SalesInvoice> currentInvoices =
        completed(principal.tenantId(), branchIds, window.from(), window.to());
    List<SalesInvoice> priorInvoices =
        completed(principal.tenantId(), branchIds, window.priorFrom(), window.priorTo());
    List<SalesInvoiceLine> currentLines = lines(principal.tenantId(), currentInvoices);
    AnalyticsView.PeriodTotals current = totals(currentInvoices, currentLines);
    AnalyticsView.PeriodTotals prior =
        totals(priorInvoices, lines(principal.tenantId(), priorInvoices));
    Map<UUID, Long> unitsSold =
        stockOutUnits(principal.tenantId(), branchIds, window.from(), window.to());
    Map<UUID, BigDecimal> onHand = onHandByProduct(principal.tenantId(), branchIds);
    return new AnalyticsView(
        compare.name(),
        window.from().toString(),
        window.to().toString(),
        window.priorFrom().toString(),
        window.priorTo().toString(),
        scope,
        primary,
        branchName,
        current,
        prior,
        new AnalyticsView.PeriodDelta(
            current.salesPaise() - prior.salesPaise(),
            AnalyticsPolicy.salesPctBps(current.salesPaise(), prior.salesPaise())),
        new AnalyticsView.SalesTrendChart(trend(window, currentInvoices, priorInvoices)),
        topSellers(principal.tenantId(), currentLines, limit),
        slowDead(principal.tenantId(), onHand, unitsSold),
        frequency(currentInvoices, priorInvoices));
  }

  private List<SalesInvoice> completed(
      UUID tenantId, List<UUID> branchIds, LocalDate from, LocalDate to) {
    return salesInvoiceRepository.findCompletedInWindow(
        tenantId,
        branchIds,
        SalesInvoiceStatus.COMPLETED,
        AnalyticsPolicy.startInstant(from),
        AnalyticsPolicy.endExclusive(to));
  }

  private List<SalesInvoiceLine> lines(UUID tenantId, List<SalesInvoice> invoices) {
    if (invoices.isEmpty()) {
      return List.of();
    }
    List<UUID> ids = invoices.stream().map(SalesInvoice::getId).toList();
    return salesInvoiceLineRepository.findAllByTenantIdAndSalesInvoiceIdIn(tenantId, ids);
  }

  private AnalyticsView.PeriodTotals totals(
      List<SalesInvoice> invoices, List<SalesInvoiceLine> lines) {
    long sales = invoices.stream().mapToLong(SalesInvoice::getTotalPaise).sum();
    long units = lines.stream().mapToLong(AnalyticsService::unitsOf).sum();
    return new AnalyticsView.PeriodTotals(sales, invoices.size(), units);
  }

  private List<AnalyticsView.TrendPoint> trend(
      AnalyticsPolicy.Window window, List<SalesInvoice> current, List<SalesInvoice> prior) {
    Map<LocalDate, Long> currentByDay = paiseByDay(current);
    Map<LocalDate, Long> priorByDay = paiseByDay(prior);
    List<AnalyticsView.TrendPoint> points = new ArrayList<>();
    long days = window.currentDays();
    for (long i = 0; i < days; i++) {
      LocalDate day = window.from().plusDays(i);
      LocalDate priorDay = window.priorFrom().plusDays(i);
      points.add(
          new AnalyticsView.TrendPoint(
              day.toString(),
              currentByDay.getOrDefault(day, 0L),
              priorByDay.getOrDefault(priorDay, 0L)));
    }
    return List.copyOf(points);
  }

  private Map<LocalDate, Long> paiseByDay(List<SalesInvoice> invoices) {
    Map<LocalDate, Long> byDay = new HashMap<>();
    for (SalesInvoice invoice : invoices) {
      if (invoice.getCompletedAt() == null) {
        continue;
      }
      LocalDate day = invoice.getCompletedAt().atZone(AnalyticsPolicy.IST).toLocalDate();
      byDay.merge(day, invoice.getTotalPaise(), Long::sum);
    }
    return byDay;
  }

  private List<AnalyticsView.TopSellerItem> topSellers(
      UUID tenantId, List<SalesInvoiceLine> lines, int limit) {
    Map<UUID, Acc> totals = new LinkedHashMap<>();
    for (SalesInvoiceLine line : lines) {
      totals.computeIfAbsent(line.getProductId(), ignored -> new Acc(line)).add(line);
    }
    List<AnalyticsView.TopSellerItem> ranked = new ArrayList<>();
    for (Acc acc : totals.values()) {
      ranked.add(acc.toItem());
    }
    ranked.sort(
        (left, right) -> {
          int sales = Long.compare(right.salesPaise(), left.salesPaise());
          return sales != 0 ? sales : Long.compare(right.units(), left.units());
        });
    if (ranked.size() > limit) {
      ranked = new ArrayList<>(ranked.subList(0, limit));
    }
    Map<UUID, Product> products =
        products(tenantId, ranked.stream().map(AnalyticsView.TopSellerItem::productId).toList());
    List<AnalyticsView.TopSellerItem> named = new ArrayList<>();
    for (AnalyticsView.TopSellerItem item : ranked) {
      Product product = products.get(item.productId());
      named.add(
          new AnalyticsView.TopSellerItem(
              item.productId(),
              product == null ? item.name() : product.getName(),
              product == null ? item.sku() : product.getSku(),
              item.units(),
              item.salesPaise()));
    }
    return List.copyOf(named);
  }

  private List<AnalyticsView.SlowDeadItem> slowDead(
      UUID tenantId, Map<UUID, BigDecimal> onHand, Map<UUID, Long> unitsSold) {
    Map<UUID, Product> products = products(tenantId, new ArrayList<>(onHand.keySet()));
    List<AnalyticsView.SlowDeadItem> items = new ArrayList<>();
    for (Map.Entry<UUID, BigDecimal> entry : onHand.entrySet()) {
      long sold = unitsSold.getOrDefault(entry.getKey(), 0L);
      String classification = AnalyticsPolicy.classify(entry.getValue(), sold);
      if (classification == null) {
        continue;
      }
      Product product = products.get(entry.getKey());
      items.add(
          new AnalyticsView.SlowDeadItem(
              entry.getKey(),
              product == null ? "Pack" : product.getName(),
              product == null ? "" : product.getSku(),
              classification,
              entry.getValue().stripTrailingZeros().toPlainString(),
              sold));
    }
    items.sort(
        (left, right) -> {
          int classOrder =
              Integer.compare(rankClass(left.classification()), rankClass(right.classification()));
          if (classOrder != 0) {
            return classOrder;
          }
          return left.name().compareToIgnoreCase(right.name());
        });
    if (items.size() > AnalyticsPolicy.SLOW_DEAD_MAX) {
      items = new ArrayList<>(items.subList(0, AnalyticsPolicy.SLOW_DEAD_MAX));
    }
    return List.copyOf(items);
  }

  private List<AnalyticsView.FrequencyBucket> frequency(
      List<SalesInvoice> current, List<SalesInvoice> prior) {
    Map<String, Integer> currentBuckets = buckets(current);
    Map<String, Integer> priorBuckets = buckets(prior);
    return List.of(
        bucket(AnalyticsPolicy.FREQ_WALK_IN, currentBuckets, priorBuckets),
        bucket(AnalyticsPolicy.FREQ_ONE, currentBuckets, priorBuckets),
        bucket(AnalyticsPolicy.FREQ_TWO_THREE, currentBuckets, priorBuckets),
        bucket(AnalyticsPolicy.FREQ_FOUR_PLUS, currentBuckets, priorBuckets));
  }

  private Map<String, Integer> buckets(List<SalesInvoice> invoices) {
    int walkIn = 0;
    Map<UUID, Integer> visits = new HashMap<>();
    for (SalesInvoice invoice : invoices) {
      if (invoice.getCustomerId() == null) {
        walkIn++;
        continue;
      }
      visits.merge(invoice.getCustomerId(), 1, Integer::sum);
    }
    int one = 0;
    int twoThree = 0;
    int fourPlus = 0;
    for (int count : visits.values()) {
      if (count <= 1) {
        one++;
      } else if (count <= 3) {
        twoThree++;
      } else {
        fourPlus++;
      }
    }
    Map<String, Integer> buckets = new LinkedHashMap<>();
    buckets.put(AnalyticsPolicy.FREQ_WALK_IN, walkIn);
    buckets.put(AnalyticsPolicy.FREQ_ONE, one);
    buckets.put(AnalyticsPolicy.FREQ_TWO_THREE, twoThree);
    buckets.put(AnalyticsPolicy.FREQ_FOUR_PLUS, fourPlus);
    return buckets;
  }

  private AnalyticsView.FrequencyBucket bucket(
      String key, Map<String, Integer> current, Map<String, Integer> prior) {
    return new AnalyticsView.FrequencyBucket(
        key, current.getOrDefault(key, 0), prior.getOrDefault(key, 0));
  }

  private Map<UUID, Long> stockOutUnits(
      UUID tenantId, List<UUID> branchIds, LocalDate from, LocalDate to) {
    Map<UUID, Long> units = new HashMap<>();
    for (StockMovement movement :
        stockMovementRepository.findByTypesInWindow(
            tenantId,
            branchIds,
            EnumSet.of(StockMovementType.STOCK_OUT),
            AnalyticsPolicy.startInstant(from),
            AnalyticsPolicy.endExclusive(to))) {
      units.merge(movement.getProductId(), movement.getQuantity().longValue(), Long::sum);
    }
    return units;
  }

  private Map<UUID, BigDecimal> onHandByProduct(UUID tenantId, List<UUID> branchIds) {
    Map<UUID, BigDecimal> onHand = new LinkedHashMap<>();
    for (StockBalance balance :
        stockBalanceRepository.findAllByTenantIdAndBranchIdIn(tenantId, branchIds)) {
      onHand.merge(balance.getProductId(), balance.getQuantity(), BigDecimal::add);
    }
    return onHand;
  }

  private Map<UUID, Product> products(UUID tenantId, List<UUID> ids) {
    if (ids.isEmpty()) {
      return Map.of();
    }
    Map<UUID, Product> byId = new HashMap<>();
    for (Product product : productRepository.findAllByTenantIdAndIdIn(tenantId, ids)) {
      byId.put(product.getId(), product);
    }
    return byId;
  }

  private List<UUID> resolveBranches(
      AuthPrincipal principal, AppUser user, UUID requested, String scope) {
    UUID tenantId = principal.tenantId();
    if (requested != null) {
      requireAccessibleBranch(principal, user, tenantId, requested);
      return List.of(requested);
    }
    if (AnalyticsPolicy.SCOPE_TENANT.equals(scope)) {
      List<UUID> ids =
          locationRepository
              .findAllByTenantIdAndDeletedAtIsNullOrderByBranchCodeAsc(tenantId)
              .stream()
              .map(Location::getId)
              .toList();
      if (ids.isEmpty()) {
        throw AnalyticsPolicy.notFound();
      }
      return ids;
    }
    UUID session = principal.activeBranchId();
    if (session == null) {
      throw AnalyticsPolicy.noActiveBranch();
    }
    requireAccessibleBranch(principal, user, tenantId, session);
    return List.of(session);
  }

  private void requireAccessibleBranch(
      AuthPrincipal principal, AppUser user, UUID tenantId, UUID branchId) {
    Location branch =
        locationRepository
            .findByIdAndTenantIdAndDeletedAtIsNull(branchId, tenantId)
            .orElseThrow(AnalyticsPolicy::notFound);
    if (user.getRole() == AppUserRole.pharmacy_owner) {
      return;
    }
    if (!userBranchRepository.existsByTenantIdAndUserIdAndBranchId(
        tenantId, principal.userId(), branch.getId())) {
      throw AnalyticsPolicy.notFound();
    }
  }

  private String branchName(UUID tenantId, UUID branchId) {
    return locationRepository
        .findByIdAndTenantIdAndDeletedAtIsNull(branchId, tenantId)
        .map(Location::getName)
        .orElse(null);
  }

  private AppUser requireUser(AuthPrincipal principal) {
    return appUserRepository
        .findById(principal.userId())
        .filter(row -> row.getDeletedAt() == null)
        .orElseThrow(AnalyticsPolicy::forbidden);
  }

  private static UUID parseUuid(String raw) {
    if (raw == null || raw.isBlank()) {
      return null;
    }
    try {
      return UUID.fromString(raw.trim());
    } catch (IllegalArgumentException ex) {
      throw AnalyticsPolicy.shape();
    }
  }

  private static long unitsOf(SalesInvoiceLine line) {
    if (line.getQuantity() == null) {
      return 0L;
    }
    return line.getQuantity().longValue();
  }

  private static int rankClass(String classification) {
    if (AnalyticsPolicy.CLASS_DEAD.equals(classification)) {
      return 0;
    }
    return 1;
  }

  private static final class Acc {
    private final UUID productId;
    private final String name;
    private final String sku;
    private long units;
    private long salesPaise;

    private Acc(SalesInvoiceLine line) {
      this.productId = line.getProductId();
      this.name = line.getProductName();
      this.sku = line.getSku();
    }

    private void add(SalesInvoiceLine line) {
      units += unitsOf(line);
      salesPaise += line.getLineTotalPaise();
    }

    private AnalyticsView.TopSellerItem toItem() {
      return new AnalyticsView.TopSellerItem(productId, name, sku, units, salesPaise);
    }
  }
}
