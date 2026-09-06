package com.nammamedmate.server.application.finance;

import com.nammamedmate.server.domain.AgingBucket;
import com.nammamedmate.server.domain.AgingPolicy;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.Customer;
import com.nammamedmate.server.domain.CustomerCreditAccount;
import com.nammamedmate.server.domain.CustomerCreditLedgerEntry;
import com.nammamedmate.server.domain.CustomerCreditLedgerType;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.ReportAccessPolicy;
import com.nammamedmate.server.domain.ReportCapability;
import com.nammamedmate.server.domain.SalesInvoice;
import com.nammamedmate.server.domain.Supplier;
import com.nammamedmate.server.domain.SupplierLedgerEntry;
import com.nammamedmate.server.domain.SupplierLedgerType;
import com.nammamedmate.server.domain.SupplierPayableAccount;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.application.subscription.SubscriptionService;
import com.nammamedmate.server.persistence.CustomerCreditAccountRepository;
import com.nammamedmate.server.persistence.CustomerCreditLedgerEntryRepository;
import com.nammamedmate.server.persistence.CustomerRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.SalesInvoiceRepository;
import com.nammamedmate.server.persistence.SupplierLedgerEntryRepository;
import com.nammamedmate.server.persistence.SupplierPayableAccountRepository;
import com.nammamedmate.server.persistence.SupplierRepository;
import com.nammamedmate.server.persistence.UserBranchRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AgingService {

  private final CustomerCreditLedgerEntryRepository creditLedgerRepository;
  private final CustomerCreditAccountRepository creditAccountRepository;
  private final CustomerRepository customerRepository;
  private final SalesInvoiceRepository salesInvoiceRepository;
  private final SupplierLedgerEntryRepository supplierLedgerRepository;
  private final SupplierPayableAccountRepository payableAccountRepository;
  private final SupplierRepository supplierRepository;
  private final LocationRepository locationRepository;
  private final UserBranchRepository userBranchRepository;
  private final FinanceAccessService financeAccessService;
  private final SubscriptionService subscriptionService;
  private final Clock clock;

  public AgingService(
      CustomerCreditLedgerEntryRepository creditLedgerRepository,
      CustomerCreditAccountRepository creditAccountRepository,
      CustomerRepository customerRepository,
      SalesInvoiceRepository salesInvoiceRepository,
      SupplierLedgerEntryRepository supplierLedgerRepository,
      SupplierPayableAccountRepository payableAccountRepository,
      SupplierRepository supplierRepository,
      LocationRepository locationRepository,
      UserBranchRepository userBranchRepository,
      FinanceAccessService financeAccessService,
      SubscriptionService subscriptionService,
      Clock clock) {
    this.creditLedgerRepository = creditLedgerRepository;
    this.creditAccountRepository = creditAccountRepository;
    this.customerRepository = customerRepository;
    this.salesInvoiceRepository = salesInvoiceRepository;
    this.supplierLedgerRepository = supplierLedgerRepository;
    this.payableAccountRepository = payableAccountRepository;
    this.supplierRepository = supplierRepository;
    this.locationRepository = locationRepository;
    this.userBranchRepository = userBranchRepository;
    this.financeAccessService = financeAccessService;
    this.subscriptionService = subscriptionService;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public AgingView receivables(
      AuthPrincipal principal, LocalDate asOfRaw, String branchIdRaw, String scope) {
    QueryScope query = resolve(principal, asOfRaw, branchIdRaw, scope);
    List<CustomerCreditLedgerEntry> entries =
        creditLedgerRepository.findAllByTenantIdAndOccurredAtOnOrBefore(
            query.tenantId(), query.cutoff());
    Map<UUID, UUID> invoiceBranches = invoiceBranches(query.tenantId(), entries);
    List<OpenItem> remaining = fifoReceivables(entries, invoiceBranches);
    boolean tenantScope = query.tenantScope();
    Set<UUID> branchSet = new HashSet<>(query.branchIds());
    List<OpenItem> scoped = new ArrayList<>();
    for (OpenItem item : remaining) {
      if (tenantScope) {
        scoped.add(item);
      } else if (item.branchId() != null && branchSet.contains(item.branchId())) {
        scoped.add(item);
      }
    }
    long source =
        query.today() && tenantScope
            ? creditAccountRepository.findAllByTenantId(query.tenantId()).stream()
                .mapToLong(CustomerCreditAccount::getBalancePaise)
                .sum()
            : scoped.stream().mapToLong(OpenItem::remaining).sum();
    Map<UUID, String> names =
        customerNames(query.tenantId(), scoped.stream().map(OpenItem::partyId).distinct().toList());
    return toView(query, scoped, source, names);
  }

  @Transactional(readOnly = true)
  public AgingView payables(
      AuthPrincipal principal, LocalDate asOfRaw, String branchIdRaw, String scope) {
    QueryScope query = resolve(principal, asOfRaw, branchIdRaw, scope);
    List<SupplierLedgerEntry> entries =
        supplierLedgerRepository.findAllByTenantIdAndBranchIdInAndOccurredAtOnOrBefore(
            query.tenantId(), query.branchIds(), query.cutoff());
    List<OpenItem> remaining = fifoPayables(entries);
    long source =
        query.today()
            ? payableAccountRepository
                .findAllByTenantIdAndBranchIdIn(query.tenantId(), query.branchIds())
                .stream()
                .mapToLong(SupplierPayableAccount::getBalancePaise)
                .sum()
            : remaining.stream().mapToLong(OpenItem::remaining).sum();
    Map<UUID, String> names =
        supplierNames(
            query.tenantId(), remaining.stream().map(OpenItem::partyId).distinct().toList());
    return toView(query, remaining, source, names);
  }

  private AgingView toView(
      QueryScope query, List<OpenItem> items, long sourceBalancePaise, Map<UUID, String> names) {
    EnumMap<AgingBucket, Long> bucketTotals = new EnumMap<>(AgingBucket.class);
    for (AgingBucket bucket : AgingPolicy.orderedBuckets()) {
      bucketTotals.put(bucket, 0L);
    }
    Map<UUID, PartyAcc> parties = new LinkedHashMap<>();
    long total = 0L;
    for (OpenItem item : items) {
      int days = AgingPolicy.days(query.asOf(), item.ageOn());
      AgingBucket bucket = AgingPolicy.bucket(days);
      bucketTotals.merge(bucket, item.remaining(), Long::sum);
      total += item.remaining();
      PartyAcc acc = parties.computeIfAbsent(item.partyId(), id -> new PartyAcc());
      acc.amount += item.remaining();
      if (days >= acc.days) {
        acc.days = days;
        acc.ageOn = item.ageOn();
        acc.branchId = item.branchId();
      }
    }
    List<AgingView.BucketView> buckets =
        AgingPolicy.orderedBuckets().stream()
            .map(
                bucket ->
                    new AgingView.BucketView(
                        bucket, bucket.label(), bucketTotals.getOrDefault(bucket, 0L)))
            .toList();
    List<AgingView.PartyView> partyViews =
        parties.entrySet().stream()
            .sorted(
                Comparator.comparing((Map.Entry<UUID, PartyAcc> e) -> e.getValue().amount)
                    .reversed())
            .map(
                entry ->
                    new AgingView.PartyView(
                        entry.getKey(),
                        names.getOrDefault(entry.getKey(), ""),
                        entry.getValue().amount,
                        entry.getValue().days,
                        entry.getValue().ageOn,
                        entry.getValue().branchId))
            .toList();
    return new AgingView(
        query.asOf(),
        query.tenantScope() ? "tenant" : "branch",
        query.tenantScope() ? null : query.branchIds().get(0),
        total,
        sourceBalancePaise,
        buckets,
        partyViews);
  }

  private List<OpenItem> fifoReceivables(
      List<CustomerCreditLedgerEntry> entries, Map<UUID, UUID> invoiceBranches) {
    Map<UUID, ArrayDeque<OpenItem>> open = new LinkedHashMap<>();
    for (CustomerCreditLedgerEntry entry : entries) {
      ArrayDeque<OpenItem> queue =
          open.computeIfAbsent(entry.getCustomerId(), id -> new ArrayDeque<>());
      if (entry.getType() == CustomerCreditLedgerType.SALE_CHARGE) {
        UUID branchId =
            entry.getInvoiceId() == null ? null : invoiceBranches.get(entry.getInvoiceId());
        queue.addLast(
            new OpenItem(
                entry.getCustomerId(),
                branchId,
                entry.getAmountPaise(),
                AgingPolicy.ageOn(null, entry.getOccurredAt()),
                entry.getOccurredAt()));
      } else if (entry.getType() == CustomerCreditLedgerType.SETTLEMENT
          || entry.getType() == CustomerCreditLedgerType.CREDIT_NOTE) {
        apply(queue, entry.getAmountPaise());
      }
    }
    List<OpenItem> remaining = new ArrayList<>();
    for (ArrayDeque<OpenItem> queue : open.values()) {
      remaining.addAll(queue);
    }
    return remaining;
  }

  private List<OpenItem> fifoPayables(List<SupplierLedgerEntry> entries) {
    Map<String, ArrayDeque<OpenItem>> open = new LinkedHashMap<>();
    for (SupplierLedgerEntry entry : entries) {
      String key = entry.getBranchId() + ":" + entry.getSupplierId();
      ArrayDeque<OpenItem> queue = open.computeIfAbsent(key, ignored -> new ArrayDeque<>());
      if (entry.getType() == SupplierLedgerType.INVOICE) {
        queue.addLast(
            new OpenItem(
                entry.getSupplierId(),
                entry.getBranchId(),
                entry.getAmountPaise(),
                AgingPolicy.ageOn(entry.getDueOn(), entry.getOccurredAt()),
                entry.getOccurredAt()));
      } else if (entry.getType() == SupplierLedgerType.PAYMENT
          || entry.getType() == SupplierLedgerType.DEBIT_NOTE) {
        apply(queue, entry.getAmountPaise());
      }
    }
    List<OpenItem> remaining = new ArrayList<>();
    for (ArrayDeque<OpenItem> queue : open.values()) {
      remaining.addAll(queue);
    }
    return remaining;
  }

  private static void apply(ArrayDeque<OpenItem> queue, long amountPaise) {
    long leftover = amountPaise;
    while (leftover > 0 && !queue.isEmpty()) {
      OpenItem first = queue.peekFirst();
      if (first.remaining() <= leftover) {
        leftover -= first.remaining();
        queue.pollFirst();
      } else {
        queue.pollFirst();
        queue.addFirst(
            new OpenItem(
                first.partyId(),
                first.branchId(),
                first.remaining() - leftover,
                first.ageOn(),
                first.occurredAt()));
        leftover = 0;
      }
    }
  }

  private Map<UUID, UUID> invoiceBranches(UUID tenantId, List<CustomerCreditLedgerEntry> entries) {
    Set<UUID> ids = new HashSet<>();
    for (CustomerCreditLedgerEntry entry : entries) {
      if (entry.getInvoiceId() != null) {
        ids.add(entry.getInvoiceId());
      }
    }
    if (ids.isEmpty()) {
      return Map.of();
    }
    Map<UUID, UUID> branches = new HashMap<>();
    for (SalesInvoice invoice : salesInvoiceRepository.findAllByTenantIdAndIdIn(tenantId, ids)) {
      branches.put(invoice.getId(), invoice.getBranchId());
    }
    return branches;
  }

  private Map<UUID, String> customerNames(UUID tenantId, List<UUID> ids) {
    if (ids.isEmpty()) {
      return Map.of();
    }
    Map<UUID, String> names = new HashMap<>();
    for (Customer customer : customerRepository.findAllByTenantIdAndIdIn(tenantId, ids)) {
      names.put(customer.getId(), customer.getName());
    }
    return names;
  }

  private Map<UUID, String> supplierNames(UUID tenantId, List<UUID> ids) {
    if (ids.isEmpty()) {
      return Map.of();
    }
    Map<UUID, String> names = new HashMap<>();
    for (Supplier supplier : supplierRepository.findAllByTenantIdAndIdIn(tenantId, ids)) {
      names.put(supplier.getId(), supplier.getLegalName());
    }
    return names;
  }

  private QueryScope resolve(
      AuthPrincipal principal, LocalDate asOfRaw, String branchIdRaw, String scope) {
    Context ctx = requireFinance(principal);
    ReportAccessPolicy.assertEntitled(
        subscriptionService.resolveReportPlan(principal.tenantId()), ReportCapability.AGING);
    LocalDate today = AgingPolicy.today(clock.instant());
    LocalDate asOf = AgingPolicy.requireAsOf(asOfRaw, today);
    List<UUID> branchIds = resolveListBranches(principal, ctx, branchIdRaw, scope);
    boolean tenantScope = "tenant".equalsIgnoreCase(scope == null ? "" : scope.trim());
    return new QueryScope(
        ctx.tenantId(), asOf, AgingPolicy.cutoff(asOf), asOf.equals(today), tenantScope, branchIds);
  }

  private List<UUID> resolveListBranches(
      AuthPrincipal principal, Context ctx, String branchIdRaw, String scope) {
    UUID requested = parseUuid(branchIdRaw);
    if (requested != null) {
      requireAccessibleBranch(principal, ctx, requested);
      return List.of(requested);
    }
    if ("tenant".equalsIgnoreCase(scope == null ? "" : scope.trim())) {
      if (principal.role() != AppUserRole.pharmacy_owner) {
        throw AgingPolicy.forbidden();
      }
      List<UUID> ids =
          locationRepository
              .findAllByTenantIdAndDeletedAtIsNullOrderByBranchCodeAsc(ctx.tenantId())
              .stream()
              .map(Location::getId)
              .toList();
      if (ids.isEmpty()) {
        throw AgingPolicy.notFound();
      }
      return ids;
    }
    if (ctx.sessionBranchId() == null) {
      throw AgingPolicy.noActiveBranch();
    }
    requireAccessibleBranch(principal, ctx, ctx.sessionBranchId());
    return List.of(ctx.sessionBranchId());
  }

  private void requireAccessibleBranch(AuthPrincipal principal, Context ctx, UUID branchId) {
    Location branch =
        locationRepository
            .findByIdAndTenantIdAndDeletedAtIsNull(branchId, ctx.tenantId())
            .orElseThrow(AgingPolicy::notFound);
    if (principal.role() == AppUserRole.pharmacy_owner) {
      return;
    }
    if (!userBranchRepository.existsByTenantIdAndUserIdAndBranchId(
        ctx.tenantId(), principal.userId(), branch.getId())) {
      throw AgingPolicy.notFound();
    }
  }

  private Context requireFinance(AuthPrincipal principal) {
    FinanceAccessService.Context access = financeAccessService.requireFinance(principal);
    return new Context(access.tenantId(), access.sessionBranchId());
  }

  private static UUID parseUuid(String raw) {
    if (raw == null || raw.isBlank()) {
      return null;
    }
    try {
      return UUID.fromString(raw.trim());
    } catch (RuntimeException ex) {
      throw AgingPolicy.shape();
    }
  }

  private record Context(UUID tenantId, UUID sessionBranchId) {}

  private record QueryScope(
      UUID tenantId,
      LocalDate asOf,
      Instant cutoff,
      boolean today,
      boolean tenantScope,
      List<UUID> branchIds) {}

  private record OpenItem(
      UUID partyId, UUID branchId, long remaining, LocalDate ageOn, Instant occurredAt) {}

  private static final class PartyAcc {
    private long amount;
    private int days = -1;
    private LocalDate ageOn;
    private UUID branchId;
  }
}
