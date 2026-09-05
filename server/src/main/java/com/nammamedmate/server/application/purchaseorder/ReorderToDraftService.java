package com.nammamedmate.server.application.purchaseorder;

import com.nammamedmate.server.application.access.AccessQueryService;
import com.nammamedmate.server.application.audit.AuditRecordCommand;
import com.nammamedmate.server.application.audit.AuditService;
import com.nammamedmate.server.application.inventory.InventoryReorderLine;
import com.nammamedmate.server.application.inventory.InventoryStockService;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.ModuleCode;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.Product;
import com.nammamedmate.server.domain.PurchaseOrderLine;
import com.nammamedmate.server.domain.PurchaseOrderPolicy;
import com.nammamedmate.server.domain.PurchaseOrderReorderRun;
import com.nammamedmate.server.domain.PurchaseOrderStatus;
import com.nammamedmate.server.domain.ReorderToDraftPolicy;
import com.nammamedmate.server.domain.StockBatch;
import com.nammamedmate.server.domain.Supplier;
import com.nammamedmate.server.domain.SupplierCategory;
import com.nammamedmate.server.domain.SupplierStatus;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.ProductRepository;
import com.nammamedmate.server.persistence.PurchaseOrderLineRepository;
import com.nammamedmate.server.persistence.PurchaseOrderReorderRunRepository;
import com.nammamedmate.server.persistence.StockBatchRepository;
import com.nammamedmate.server.persistence.SupplierCategoryRepository;
import com.nammamedmate.server.persistence.SupplierRepository;
import com.nammamedmate.server.persistence.TenantSubscriptionRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReorderToDraftService {

  private static final String NO_BRANCH_CODE = "NO_BRANCH";
  private static final String NO_BRANCH_MESSAGE =
      "Select an outlet before placing a purchase order.";
  private static final String REORDER_NOTES = "Draft from outlet reorder";

  private final PurchaseOrderService purchaseOrderService;
  private final InventoryStockService inventoryStockService;
  private final PurchaseOrderReorderRunRepository reorderRunRepository;
  private final TenantSubscriptionRepository tenantSubscriptionRepository;
  private final SupplierRepository supplierRepository;
  private final SupplierCategoryRepository supplierCategoryRepository;
  private final ProductRepository productRepository;
  private final PurchaseOrderLineRepository purchaseOrderLineRepository;
  private final StockBatchRepository stockBatchRepository;
  private final AppUserRepository appUserRepository;
  private final AccessQueryService accessQueryService;
  private final AuditService auditService;
  private final Clock clock;

  public ReorderToDraftService(
      PurchaseOrderService purchaseOrderService,
      InventoryStockService inventoryStockService,
      PurchaseOrderReorderRunRepository reorderRunRepository,
      TenantSubscriptionRepository tenantSubscriptionRepository,
      SupplierRepository supplierRepository,
      SupplierCategoryRepository supplierCategoryRepository,
      ProductRepository productRepository,
      PurchaseOrderLineRepository purchaseOrderLineRepository,
      StockBatchRepository stockBatchRepository,
      AppUserRepository appUserRepository,
      AccessQueryService accessQueryService,
      AuditService auditService,
      Clock clock) {
    this.purchaseOrderService = purchaseOrderService;
    this.inventoryStockService = inventoryStockService;
    this.reorderRunRepository = reorderRunRepository;
    this.tenantSubscriptionRepository = tenantSubscriptionRepository;
    this.supplierRepository = supplierRepository;
    this.supplierCategoryRepository = supplierCategoryRepository;
    this.productRepository = productRepository;
    this.purchaseOrderLineRepository = purchaseOrderLineRepository;
    this.stockBatchRepository = stockBatchRepository;
    this.appUserRepository = appUserRepository;
    this.accessQueryService = accessQueryService;
    this.auditService = auditService;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public ReorderDraftResult preview(AuthPrincipal principal) {
    Context ctx = requireReady(principal);
    PlanCode plan = planOf(ctx.tenantId());
    ReorderToDraftPolicy.assertReorderDraftEntitled(plan);
    return previewLive(ctx, plan);
  }

  @Transactional
  public ReorderDraftResult fromReorder(
      AuthPrincipal principal, String idempotencyKey, String fingerprint) {
    Context ctx = requireReady(principal);
    PlanCode plan = planOf(ctx.tenantId());
    ReorderToDraftPolicy.assertReorderDraftEntitled(plan);
    String key = ReorderToDraftPolicy.requireIdempotencyKey(idempotencyKey);
    String expected = ReorderToDraftPolicy.requireFingerprint(fingerprint);
    return reorderRunRepository
        .lockByTenantIdAndBranchIdAndIdempotencyKey(ctx.tenantId(), ctx.branchId(), key)
        .map(existing -> toResult(principal, existing, plan))
        .orElseGet(() -> insertRun(principal, ctx, plan, key, expected));
  }

  @Transactional
  public List<PurchaseOrderView> bulk(AuthPrincipal principal, BulkPurchaseOrderCommand command) {
    requireReady(principal);
    ReorderToDraftPolicy.assertProPoTools(planOf(principal.tenantId()));
    if (command == null || command.items() == null || command.items().isEmpty()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
    PurchaseOrderStatus target = ReorderToDraftPolicy.bulkTarget(command.action());
    List<PurchaseOrderView> updated = new ArrayList<>();
    for (BulkPurchaseOrderCommand.Item item : command.items()) {
      if (item == null || item.id() == null) {
        throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
      }
      if (target == PurchaseOrderStatus.ISSUED) {
        updated.add(purchaseOrderService.issue(principal, item.id(), item.expectedVersion()));
      } else {
        updated.add(purchaseOrderService.cancel(principal, item.id(), item.expectedVersion()));
      }
    }
    audit(
        principal,
        ReorderToDraftPolicy.bulkAuditAction(target),
        "{\"count\":" + updated.size() + "}");
    return updated;
  }

  @Transactional(readOnly = true)
  public PurchaseOrderAnalyticsView analytics(AuthPrincipal principal) {
    requireReady(principal);
    ReorderToDraftPolicy.assertProPoTools(planOf(principal.tenantId()));
    Map<UUID, PurchaseOrderAnalyticsView.SupplierSpend> bySupplier = new LinkedHashMap<>();
    long total = 0L;
    for (PurchaseOrderView order : purchaseOrderService.list(principal).items()) {
      if (order.status() != PurchaseOrderStatus.ISSUED
          && order.status() != PurchaseOrderStatus.CLOSED) {
        continue;
      }
      total += order.totalPaise();
      PurchaseOrderAnalyticsView.SupplierSpend existing = bySupplier.get(order.supplierId());
      if (existing == null) {
        bySupplier.put(
            order.supplierId(),
            new PurchaseOrderAnalyticsView.SupplierSpend(
                order.supplierId(), order.supplierLegalName(), 1L, order.totalPaise()));
      } else {
        bySupplier.put(
            order.supplierId(),
            new PurchaseOrderAnalyticsView.SupplierSpend(
                existing.supplierId(),
                existing.supplierLegalName(),
                existing.orderCount() + 1,
                existing.spendPaise() + order.totalPaise()));
      }
    }
    List<PurchaseOrderAnalyticsView.SupplierSpend> suppliers =
        bySupplier.values().stream()
            .sorted((a, b) -> Long.compare(b.spendPaise(), a.spendPaise()))
            .toList();
    return new PurchaseOrderAnalyticsView(total, suppliers);
  }

  private ReorderDraftResult insertRun(
      AuthPrincipal principal, Context ctx, PlanCode plan, String key, String expected) {
    ReorderDraftResult live = previewLive(ctx, plan);
    ReorderToDraftPolicy.assertFingerprint(live.fingerprint(), expected);
    Instant now = clock.instant();
    PurchaseOrderReorderRun run = new PurchaseOrderReorderRun();
    run.setId(UUID.randomUUID());
    run.setTenantId(ctx.tenantId());
    run.setBranchId(ctx.branchId());
    run.setIdempotencyKey(key);
    run.setFingerprint(live.fingerprint());
    run.setUnmapped(toUnmappedMaps(live.unmapped()));
    run.setCreatedByUserId(principal.userId());
    run.setCreatedAt(now);
    List<String> draftIds = new ArrayList<>();
    List<PurchaseOrderView> drafts = new ArrayList<>();
    for (PurchaseOrderView proposed : live.drafts()) {
      PurchaseOrderView created =
          purchaseOrderService.create(
              principal,
              new CreatePurchaseOrderCommand(
                  proposed.supplierId(),
                  null,
                  proposed.paymentTerms(),
                  REORDER_NOTES,
                  UUID.randomUUID().toString(),
                  proposed.lines().stream()
                      .map(
                          line ->
                              new CreatePurchaseOrderCommand.Line(
                                  line.productId(), line.quantity(), line.unitRatePaise()))
                      .toList()));
      drafts.add(created);
      draftIds.add(created.id().toString());
    }
    run.setDraftIds(draftIds);
    reorderRunRepository.save(run);
    audit(
        principal,
        "PURCHASE_ORDER_FROM_REORDER",
        "{\"runId\":\"" + run.getId() + "\",\"drafts\":" + draftIds.size() + "}");
    return new ReorderDraftResult(live.fingerprint(), plan, drafts, live.unmapped());
  }

  private ReorderDraftResult previewLive(Context ctx, PlanCode plan) {
    List<InventoryReorderLine> lines =
        inventoryStockService.listReorderLinesForBranch(ctx.tenantId(), ctx.branchId());
    ReorderToDraftPolicy.assertNotEmpty(lines);
    Map<UUID, Product> products = new HashMap<>();
    for (Product product : productRepository.findAllByTenantIdOrderByNameAsc(ctx.tenantId())) {
      products.put(product.getId(), product);
    }
    Map<UUID, Supplier> suppliers = new HashMap<>();
    for (Supplier supplier :
        supplierRepository.findAllByTenantIdOrderByLegalNameAsc(ctx.tenantId())) {
      suppliers.put(supplier.getId(), supplier);
    }
    Map<UUID, List<UUID>> activeByCategory = new HashMap<>();
    Map<UUID, Boolean> inactiveByCategory = new HashMap<>();
    for (SupplierCategory link : supplierCategoryRepository.findAllByTenantId(ctx.tenantId())) {
      Supplier supplier = suppliers.get(link.getSupplierId());
      if (supplier == null) {
        continue;
      }
      if (supplier.getStatus() == SupplierStatus.ACTIVE) {
        List<UUID> ids =
            activeByCategory.computeIfAbsent(link.getCategoryId(), ignored -> new ArrayList<>());
        if (!ids.contains(supplier.getId())) {
          ids.add(supplier.getId());
        }
      } else {
        inactiveByCategory.put(link.getCategoryId(), true);
      }
    }
    List<ReorderToDraftPolicy.FingerprintLine> fingerprintLines = new ArrayList<>();
    List<ReorderDraftResult.UnmappedLine> unmapped = new ArrayList<>();
    Map<UUID, List<PurchaseOrderView.LineView>> draftLines = new LinkedHashMap<>();
    Map<UUID, String> supplierNames = new LinkedHashMap<>();
    for (InventoryReorderLine line : lines) {
      fingerprintLines.add(
          new ReorderToDraftPolicy.FingerprintLine(
              line.productId(), line.onHand(), line.suggestedOrderQty()));
      Product product = products.get(line.productId());
      boolean usable = product != null && product.isActive() && !product.isDiscontinued();
      UUID categoryId = product == null ? null : product.getCategoryId();
      List<UUID> active =
          categoryId == null
              ? List.of()
              : List.copyOf(activeByCategory.getOrDefault(categoryId, List.of()));
      boolean inactiveMatch = Boolean.TRUE.equals(inactiveByCategory.get(categoryId));
      Long rate = active.size() == 1 ? unitRate(ctx, line.productId(), active.get(0)) : null;
      String reason =
          ReorderToDraftPolicy.unmappedReason(
              usable, active, inactiveMatch, line.suggestedOrderQty(), rate);
      if (reason != null) {
        unmapped.add(
            new ReorderDraftResult.UnmappedLine(
                line.productId(), line.sku(), line.name(), line.suggestedOrderQty(), reason));
        continue;
      }
      UUID supplierId = active.get(0);
      supplierNames.putIfAbsent(supplierId, suppliers.get(supplierId).getLegalName());
      BigDecimal qty = ReorderToDraftPolicy.quantity(line.suggestedOrderQty());
      PurchaseOrderPolicy.LineMoney money =
          PurchaseOrderPolicy.lineMoney(qty, rate, product.getGstRate(), product.isTaxable());
      draftLines
          .computeIfAbsent(supplierId, ignored -> new ArrayList<>())
          .add(
              new PurchaseOrderView.LineView(
                  null,
                  line.productId(),
                  line.name(),
                  line.sku(),
                  qty,
                  rate,
                  product.getGstRate(),
                  money.subtotalPaise(),
                  money.taxPaise(),
                  money.totalPaise()));
    }
    String fingerprint = ReorderToDraftPolicy.fingerprint(fingerprintLines);
    List<PurchaseOrderView> drafts = new ArrayList<>();
    for (Map.Entry<UUID, List<PurchaseOrderView.LineView>> entry : draftLines.entrySet()) {
      List<PurchaseOrderPolicy.LineMoney> money =
          entry.getValue().stream()
              .map(
                  line ->
                      new PurchaseOrderPolicy.LineMoney(
                          line.lineSubtotalPaise(), line.lineTaxPaise(), line.lineTotalPaise()))
              .toList();
      PurchaseOrderPolicy.OrderMoney totals = PurchaseOrderPolicy.orderMoney(money);
      drafts.add(
          new PurchaseOrderView(
              null,
              ctx.tenantId(),
              ctx.branchId(),
              entry.getKey(),
              supplierNames.get(entry.getKey()),
              null,
              PurchaseOrderStatus.DRAFT,
              null,
              suppliers.get(entry.getKey()).getPaymentTerms(),
              REORDER_NOTES,
              0,
              totals.subtotalPaise(),
              totals.taxPaise(),
              totals.totalPaise(),
              entry.getValue(),
              null,
              null));
    }
    return new ReorderDraftResult(fingerprint, plan, drafts, unmapped);
  }

  private Long unitRate(Context ctx, UUID productId, UUID supplierId) {
    List<PurchaseOrderLine> recent =
        purchaseOrderLineRepository.findRecentRatesForProductAndSupplier(
            ctx.tenantId(), ctx.branchId(), productId, supplierId);
    if (!recent.isEmpty() && recent.get(0).getUnitRatePaise() > 0) {
      return recent.get(0).getUnitRatePaise();
    }
    return stockBatchRepository
        .findFirstByTenantIdAndProductIdAndPurchasePricePaiseGreaterThanOrderByCreatedAtDesc(
            ctx.tenantId(), productId, 0L)
        .map(StockBatch::getPurchasePricePaise)
        .orElse(null);
  }

  private ReorderDraftResult toResult(
      AuthPrincipal principal, PurchaseOrderReorderRun run, PlanCode plan) {
    List<PurchaseOrderView> drafts = new ArrayList<>();
    for (String id : run.getDraftIds()) {
      drafts.add(purchaseOrderService.get(principal, UUID.fromString(id)));
    }
    List<ReorderDraftResult.UnmappedLine> unmapped = new ArrayList<>();
    for (Map<String, Object> row : run.getUnmapped()) {
      unmapped.add(
          new ReorderDraftResult.UnmappedLine(
              UUID.fromString(String.valueOf(row.get("productId"))),
              String.valueOf(row.get("sku")),
              String.valueOf(row.get("name")),
              ((Number) row.get("suggestedOrderQty")).intValue(),
              String.valueOf(row.get("reason"))));
    }
    return new ReorderDraftResult(run.getFingerprint(), plan, drafts, unmapped);
  }

  private static List<Map<String, Object>> toUnmappedMaps(
      List<ReorderDraftResult.UnmappedLine> unmapped) {
    List<Map<String, Object>> rows = new ArrayList<>();
    for (ReorderDraftResult.UnmappedLine line : unmapped) {
      Map<String, Object> row = new LinkedHashMap<>();
      row.put("productId", line.productId().toString());
      row.put("sku", line.sku());
      row.put("name", line.name());
      row.put("suggestedOrderQty", line.suggestedOrderQty());
      row.put("reason", line.reason());
      rows.add(row);
    }
    return rows;
  }

  private PlanCode planOf(UUID tenantId) {
    return tenantSubscriptionRepository
        .findByTenantId(tenantId)
        .map(row -> row.getPlanCode())
        .orElse(PlanCode.FREE);
  }

  private Context requireReady(AuthPrincipal principal) {
    UUID tenantId = requireProcurementAccess(principal);
    UUID branchId = principal.activeBranchId();
    if (branchId == null) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, NO_BRANCH_CODE, NO_BRANCH_MESSAGE);
    }
    return new Context(tenantId, branchId);
  }

  private UUID requireProcurementAccess(AuthPrincipal principal) {
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
            .orElseThrow(ReorderToDraftService::forbidden);
    if (!accessQueryService.effectiveModules(user).contains(ModuleCode.PROCUREMENT)) {
      throw forbidden();
    }
    return principal.tenantId();
  }

  private void audit(AuthPrincipal principal, String action, String detail) {
    auditService.record(
        new AuditRecordCommand(
            principal.userId(),
            principal.tenantId(),
            principal.activeBranchId(),
            action,
            AuditService.OUTCOME_SUCCESS,
            null,
            null,
            null,
            principal.sessionId(),
            detail));
  }

  private static ApiException forbidden() {
    return new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Forbidden");
  }

  private record Context(UUID tenantId, UUID branchId) {}
}
