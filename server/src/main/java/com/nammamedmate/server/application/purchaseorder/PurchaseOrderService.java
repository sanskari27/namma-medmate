package com.nammamedmate.server.application.purchaseorder;

import com.nammamedmate.server.application.access.AccessQueryService;
import com.nammamedmate.server.application.audit.AuditRecordCommand;
import com.nammamedmate.server.application.audit.AuditService;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.BranchStatus;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.ModuleCode;
import com.nammamedmate.server.domain.Product;
import com.nammamedmate.server.domain.PurchaseOrder;
import com.nammamedmate.server.domain.PurchaseOrderLine;
import com.nammamedmate.server.domain.PurchaseOrderPolicy;
import com.nammamedmate.server.domain.PurchaseOrderStatus;
import com.nammamedmate.server.domain.PurchaseOrderVersion;
import com.nammamedmate.server.domain.Supplier;
import com.nammamedmate.server.domain.SupplierPaymentTerms;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.ProductRepository;
import com.nammamedmate.server.persistence.PurchaseOrderLineRepository;
import com.nammamedmate.server.persistence.PurchaseOrderRepository;
import com.nammamedmate.server.persistence.PurchaseOrderVersionRepository;
import com.nammamedmate.server.persistence.SupplierRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PurchaseOrderService {

  private static final ZoneId IST = ZoneId.of("Asia/Kolkata");
  private static final String NO_BRANCH_CODE = "NO_BRANCH";
  private static final String NO_BRANCH_MESSAGE =
      "Select an outlet before placing a purchase order.";

  private final PurchaseOrderRepository purchaseOrderRepository;
  private final PurchaseOrderLineRepository purchaseOrderLineRepository;
  private final PurchaseOrderVersionRepository purchaseOrderVersionRepository;
  private final SupplierRepository supplierRepository;
  private final ProductRepository productRepository;
  private final LocationRepository locationRepository;
  private final AppUserRepository appUserRepository;
  private final AccessQueryService accessQueryService;
  private final AuditService auditService;
  private final Clock clock;

  public PurchaseOrderService(
      PurchaseOrderRepository purchaseOrderRepository,
      PurchaseOrderLineRepository purchaseOrderLineRepository,
      PurchaseOrderVersionRepository purchaseOrderVersionRepository,
      SupplierRepository supplierRepository,
      ProductRepository productRepository,
      LocationRepository locationRepository,
      AppUserRepository appUserRepository,
      AccessQueryService accessQueryService,
      AuditService auditService,
      Clock clock) {
    this.purchaseOrderRepository = purchaseOrderRepository;
    this.purchaseOrderLineRepository = purchaseOrderLineRepository;
    this.purchaseOrderVersionRepository = purchaseOrderVersionRepository;
    this.supplierRepository = supplierRepository;
    this.productRepository = productRepository;
    this.locationRepository = locationRepository;
    this.appUserRepository = appUserRepository;
    this.accessQueryService = accessQueryService;
    this.auditService = auditService;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public PurchaseOrdersResult list(AuthPrincipal principal) {
    Context ctx = requireReady(principal);
    List<PurchaseOrderView> items =
        purchaseOrderRepository
            .findByTenantIdAndBranchIdOrderByCreatedAtDesc(ctx.tenantId(), ctx.branchId())
            .stream()
            .map(order -> toView(order, linesOf(order)))
            .toList();
    return new PurchaseOrdersResult(items);
  }

  @Transactional(readOnly = true)
  public PurchaseOrderView get(AuthPrincipal principal, UUID id) {
    Context ctx = requireReady(principal);
    PurchaseOrder order = requireOrder(id, ctx);
    return toView(order, linesOf(order));
  }

  @Transactional(readOnly = true)
  public PurchaseOrderVersionsResult versions(AuthPrincipal principal, UUID id) {
    Context ctx = requireReady(principal);
    PurchaseOrder order = requireOrder(id, ctx);
    List<PurchaseOrderVersionView> items =
        purchaseOrderVersionRepository
            .findAllByPurchaseOrderIdAndTenantIdAndBranchIdOrderByVersionAsc(
                order.getId(), ctx.tenantId(), ctx.branchId())
            .stream()
            .map(
                row ->
                    new PurchaseOrderVersionView(
                        row.getVersion(),
                        row.getCreatedAt(),
                        row.getChangedByUserId(),
                        row.getStatus(),
                        row.getTotalPaise(),
                        row.getSnapshot()))
            .toList();
    return new PurchaseOrderVersionsResult(items);
  }

  @Transactional
  public PurchaseOrderView create(AuthPrincipal principal, CreatePurchaseOrderCommand command) {
    Context ctx = requireReady(principal);
    String key = requireIdempotencyKey(command.idempotencyKey());
    return purchaseOrderRepository
        .findByTenantIdAndBranchIdAndIdempotencyKey(ctx.tenantId(), ctx.branchId(), key)
        .map(existing -> toView(existing, linesOf(existing)))
        .orElseGet(() -> insert(principal, ctx, command, key));
  }

  @Transactional
  public PurchaseOrderView update(
      AuthPrincipal principal, UUID id, UpdatePurchaseOrderCommand command) {
    Context ctx = requireReady(principal);
    PurchaseOrder order =
        purchaseOrderRepository
            .lockByIdAndTenantIdAndBranchId(id, ctx.tenantId(), ctx.branchId())
            .orElseThrow(PurchaseOrderService::notFound);
    PurchaseOrderPolicy.assertVersion(order.getVersion(), command.expectedVersion());
    PurchaseOrderPolicy.assertEditable(order.getStatus());
    PurchaseOrderPolicy.assertSameSupplier(order.getSupplierId(), command.supplierId());
    Supplier supplier = requireSupplier(order.getSupplierId(), ctx.tenantId());
    PurchaseOrderPolicy.assertSupplierActive(supplier.getStatus());
    Instant now = clock.instant();
    applyHeader(order, command.expectedDeliveryDate(), command.paymentTerms(), command.notes());
    List<PurchaseOrderLine> lines = replaceLines(order, command.lines(), now);
    order.setVersion(order.getVersion() + 1);
    order.setUpdatedAt(now);
    persistVersion(order, lines, supplier, principal.userId(), now);
    purchaseOrderRepository.save(order);
    audit(principal, "PURCHASE_ORDER_UPDATE", order.getId());
    return toView(order, lines);
  }

  @Transactional
  public PurchaseOrderView issue(AuthPrincipal principal, UUID id, Integer expectedVersion) {
    return transition(
        principal, id, expectedVersion, PurchaseOrderStatus.ISSUED, "PURCHASE_ORDER_ISSUE");
  }

  @Transactional
  public PurchaseOrderView close(AuthPrincipal principal, UUID id, Integer expectedVersion) {
    return transition(
        principal, id, expectedVersion, PurchaseOrderStatus.CLOSED, "PURCHASE_ORDER_CLOSE");
  }

  @Transactional
  public PurchaseOrderView cancel(AuthPrincipal principal, UUID id, Integer expectedVersion) {
    return transition(
        principal, id, expectedVersion, PurchaseOrderStatus.CANCELLED, "PURCHASE_ORDER_CANCEL");
  }

  private PurchaseOrderView insert(
      AuthPrincipal principal, Context ctx, CreatePurchaseOrderCommand command, String key) {
    UUID supplierId = PurchaseOrderPolicy.requireSupplierId(command.supplierId());
    Supplier supplier = requireSupplier(supplierId, ctx.tenantId());
    PurchaseOrderPolicy.assertSupplierActive(supplier.getStatus());
    PurchaseOrderPolicy.requireLines(command.lines());
    Location branch = requireActiveBranch(ctx.tenantId(), ctx.branchId());
    Instant now = clock.instant();
    PurchaseOrder order = new PurchaseOrder();
    order.setId(UUID.randomUUID());
    order.setTenantId(ctx.tenantId());
    order.setBranchId(ctx.branchId());
    order.setSupplierId(supplier.getId());
    order.setPoNumber(nextPoNumber(ctx, branch, now));
    order.setStatus(PurchaseOrderStatus.DRAFT);
    applyHeader(order, command.expectedDeliveryDate(), command.paymentTerms(), command.notes());
    if (order.getPaymentTerms() == null) {
      order.setPaymentTerms(supplier.getPaymentTerms());
    }
    order.setVersion(1);
    order.setIdempotencyKey(key);
    order.setCreatedByUserId(principal.userId());
    order.setCreatedAt(now);
    order.setUpdatedAt(now);
    purchaseOrderRepository.saveAndFlush(order);
    List<PurchaseOrderLine> lines = replaceLines(order, command.lines(), now);
    persistVersion(order, lines, supplier, principal.userId(), now);
    audit(principal, "PURCHASE_ORDER_CREATE", order.getId());
    return toView(order, lines);
  }

  private PurchaseOrderView transition(
      AuthPrincipal principal,
      UUID id,
      Integer expectedVersion,
      PurchaseOrderStatus target,
      String action) {
    Context ctx = requireReady(principal);
    PurchaseOrder order =
        purchaseOrderRepository
            .lockByIdAndTenantIdAndBranchId(id, ctx.tenantId(), ctx.branchId())
            .orElseThrow(PurchaseOrderService::notFound);
    PurchaseOrderPolicy.assertVersion(order.getVersion(), expectedVersion);
    PurchaseOrderPolicy.assertTransition(order.getStatus(), target);
    Supplier supplier = requireSupplier(order.getSupplierId(), ctx.tenantId());
    Instant now = clock.instant();
    order.setStatus(target);
    order.setVersion(order.getVersion() + 1);
    order.setUpdatedAt(now);
    List<PurchaseOrderLine> lines = linesOf(order);
    persistVersion(order, lines, supplier, principal.userId(), now);
    purchaseOrderRepository.save(order);
    audit(principal, action, order.getId());
    return toView(order, lines);
  }

  private List<PurchaseOrderLine> replaceLines(
      PurchaseOrder order, List<CreatePurchaseOrderCommand.Line> incoming, Instant now) {
    PurchaseOrderPolicy.requireLines(incoming);
    purchaseOrderLineRepository.deleteByPurchaseOrderIdAndTenantIdAndBranchId(
        order.getId(), order.getTenantId(), order.getBranchId());
    Set<UUID> seen = new LinkedHashSet<>();
    List<PurchaseOrderLine> saved = new ArrayList<>();
    List<PurchaseOrderPolicy.LineMoney> money = new ArrayList<>();
    int sort = 0;
    for (CreatePurchaseOrderCommand.Line item : incoming) {
      if (item == null || item.productId() == null || !seen.add(item.productId())) {
        throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
      }
      Product product = requireProduct(item.productId(), order.getTenantId());
      PurchaseOrderPolicy.assertProductActive(product.isActive(), product.isDiscontinued());
      BigDecimal qty =
          PurchaseOrderPolicy.requireQuantity(item.quantity(), product.getQuantityPrecision());
      long rate = PurchaseOrderPolicy.requireUnitRatePaise(item.unitRatePaise());
      PurchaseOrderPolicy.LineMoney lineMoney =
          PurchaseOrderPolicy.lineMoney(qty, rate, product.getGstRate(), product.isTaxable());
      money.add(lineMoney);
      PurchaseOrderLine line = new PurchaseOrderLine();
      line.setId(UUID.randomUUID());
      line.setTenantId(order.getTenantId());
      line.setBranchId(order.getBranchId());
      line.setPurchaseOrderId(order.getId());
      line.setProductId(product.getId());
      line.setProductName(product.getName());
      line.setSku(product.getSku());
      line.setQuantity(qty);
      line.setUnitRatePaise(rate);
      line.setGstRate(product.getGstRate());
      line.setLineSubtotalPaise(lineMoney.subtotalPaise());
      line.setLineTaxPaise(lineMoney.taxPaise());
      line.setLineTotalPaise(lineMoney.totalPaise());
      line.setSortOrder(sort++);
      line.setCreatedAt(now);
      saved.add(purchaseOrderLineRepository.save(line));
    }
    PurchaseOrderPolicy.OrderMoney totals = PurchaseOrderPolicy.orderMoney(money);
    order.setSubtotalPaise(totals.subtotalPaise());
    order.setTaxPaise(totals.taxPaise());
    order.setTotalPaise(totals.totalPaise());
    return saved;
  }

  private void persistVersion(
      PurchaseOrder order,
      List<PurchaseOrderLine> lines,
      Supplier supplier,
      UUID actorId,
      Instant now) {
    PurchaseOrderVersion version = new PurchaseOrderVersion();
    version.setId(UUID.randomUUID());
    version.setTenantId(order.getTenantId());
    version.setBranchId(order.getBranchId());
    version.setPurchaseOrderId(order.getId());
    version.setVersion(order.getVersion());
    version.setStatus(order.getStatus());
    version.setTotalPaise(order.getTotalPaise());
    version.setSnapshot(snapshot(order, lines, supplier));
    version.setChangedByUserId(actorId);
    version.setCreatedAt(now);
    purchaseOrderVersionRepository.save(version);
  }

  private Map<String, Object> snapshot(
      PurchaseOrder order, List<PurchaseOrderLine> lines, Supplier supplier) {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("poNumber", order.getPoNumber());
    body.put("status", order.getStatus().name());
    body.put("supplierId", order.getSupplierId().toString());
    body.put("supplierLegalName", supplier.getLegalName());
    body.put(
        "expectedDeliveryDate",
        order.getExpectedDeliveryDate() == null
            ? null
            : order.getExpectedDeliveryDate().toString());
    body.put(
        "paymentTerms", order.getPaymentTerms() == null ? null : order.getPaymentTerms().name());
    body.put("notes", order.getNotes());
    body.put("subtotalPaise", order.getSubtotalPaise());
    body.put("taxPaise", order.getTaxPaise());
    body.put("totalPaise", order.getTotalPaise());
    List<Map<String, Object>> lineMaps = new ArrayList<>();
    for (PurchaseOrderLine line : lines) {
      Map<String, Object> row = new LinkedHashMap<>();
      row.put("productId", line.getProductId().toString());
      row.put("productName", line.getProductName());
      row.put("sku", line.getSku());
      row.put("quantity", line.getQuantity().toPlainString());
      row.put("unitRatePaise", line.getUnitRatePaise());
      row.put("gstRate", line.getGstRate() == null ? null : line.getGstRate().toPlainString());
      row.put("lineSubtotalPaise", line.getLineSubtotalPaise());
      row.put("lineTaxPaise", line.getLineTaxPaise());
      row.put("lineTotalPaise", line.getLineTotalPaise());
      lineMaps.add(row);
    }
    body.put("lines", lineMaps);
    return body;
  }

  private String nextPoNumber(Context ctx, Location branch, Instant now) {
    LocalDate ist = LocalDate.ofInstant(now, IST);
    String fy = PurchaseOrderPolicy.financialYear(ist);
    String prefix = "PO/" + fy + "/" + branch.getBranchCode() + "/";
    int seq =
        (int)
                purchaseOrderRepository.countByTenantIdAndBranchIdAndPoNumberStartingWith(
                    ctx.tenantId(), ctx.branchId(), prefix)
            + 1;
    return PurchaseOrderPolicy.poNumber(fy, branch.getBranchCode(), seq);
  }

  private void applyHeader(
      PurchaseOrder order,
      LocalDate expectedDeliveryDate,
      SupplierPaymentTerms paymentTerms,
      String notes) {
    order.setExpectedDeliveryDate(expectedDeliveryDate);
    if (paymentTerms != null) {
      order.setPaymentTerms(paymentTerms);
    }
    order.setNotes(notes == null || notes.isBlank() ? null : notes.trim());
  }

  private List<PurchaseOrderLine> linesOf(PurchaseOrder order) {
    return purchaseOrderLineRepository
        .findAllByPurchaseOrderIdAndTenantIdAndBranchIdOrderBySortOrderAsc(
            order.getId(), order.getTenantId(), order.getBranchId());
  }

  private PurchaseOrderView toView(PurchaseOrder order, List<PurchaseOrderLine> lines) {
    String supplierName =
        supplierRepository
            .findByIdAndTenantId(order.getSupplierId(), order.getTenantId())
            .map(Supplier::getLegalName)
            .orElse("");
    return new PurchaseOrderView(
        order.getId(),
        order.getTenantId(),
        order.getBranchId(),
        order.getSupplierId(),
        supplierName,
        order.getPoNumber(),
        order.getStatus(),
        order.getExpectedDeliveryDate(),
        order.getPaymentTerms(),
        order.getNotes(),
        order.getVersion(),
        order.getSubtotalPaise(),
        order.getTaxPaise(),
        order.getTotalPaise(),
        lines.stream()
            .map(
                line ->
                    new PurchaseOrderView.LineView(
                        line.getId(),
                        line.getProductId(),
                        line.getProductName(),
                        line.getSku(),
                        line.getQuantity(),
                        line.getUnitRatePaise(),
                        line.getGstRate(),
                        line.getLineSubtotalPaise(),
                        line.getLineTaxPaise(),
                        line.getLineTotalPaise()))
            .toList(),
        order.getCreatedAt(),
        order.getUpdatedAt());
  }

  private PurchaseOrder requireOrder(UUID id, Context ctx) {
    return purchaseOrderRepository
        .findByIdAndTenantIdAndBranchId(id, ctx.tenantId(), ctx.branchId())
        .orElseThrow(PurchaseOrderService::notFound);
  }

  private Supplier requireSupplier(UUID id, UUID tenantId) {
    return supplierRepository
        .findByIdAndTenantId(id, tenantId)
        .orElseThrow(PurchaseOrderService::notFound);
  }

  private Product requireProduct(UUID id, UUID tenantId) {
    return productRepository
        .findByIdAndTenantId(id, tenantId)
        .orElseThrow(PurchaseOrderService::notFound);
  }

  private Location requireActiveBranch(UUID tenantId, UUID branchId) {
    Location branch =
        locationRepository
            .findByIdAndTenantIdAndDeletedAtIsNull(branchId, tenantId)
            .orElseThrow(PurchaseOrderService::notFound);
    if (branch.getStatus() != BranchStatus.ACTIVE) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY, "BRANCH_INACTIVE", "Outlet is not active.");
    }
    return branch;
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
            .orElseThrow(PurchaseOrderService::forbidden);
    if (!accessQueryService.effectiveModules(user).contains(ModuleCode.PROCUREMENT)) {
      throw forbidden();
    }
    return principal.tenantId();
  }

  private String requireIdempotencyKey(String key) {
    if (key == null || key.isBlank() || key.length() > 128) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
    return key.trim();
  }

  private void audit(AuthPrincipal principal, String action, UUID purchaseOrderId) {
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
            "{\"purchaseOrderId\":\"" + purchaseOrderId + "\"}"));
  }

  private static ApiException notFound() {
    return new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Purchase order was not found");
  }

  private static ApiException forbidden() {
    return new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Forbidden");
  }

  private record Context(UUID tenantId, UUID branchId) {}
}
