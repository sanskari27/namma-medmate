package com.nammamedmate.server.application.purchaseorder;

import com.nammamedmate.server.application.access.AccessQueryService;
import com.nammamedmate.server.application.audit.AuditRecordCommand;
import com.nammamedmate.server.application.audit.AuditService;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.BranchStatus;
import com.nammamedmate.server.domain.GoodsReceipt;
import com.nammamedmate.server.domain.GoodsReceiptLine;
import com.nammamedmate.server.domain.GoodsReceiptPolicy;
import com.nammamedmate.server.domain.GoodsReceiptStatus;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.ModuleCode;
import com.nammamedmate.server.domain.PurchaseOrder;
import com.nammamedmate.server.domain.PurchaseOrderLine;
import com.nammamedmate.server.domain.PurchaseOrderPolicy;
import com.nammamedmate.server.domain.Supplier;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.GoodsReceiptLineRepository;
import com.nammamedmate.server.persistence.GoodsReceiptRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.PurchaseOrderLineRepository;
import com.nammamedmate.server.persistence.PurchaseOrderRepository;
import com.nammamedmate.server.persistence.SupplierRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GoodsReceiptService {

  private static final ZoneId IST = ZoneId.of("Asia/Kolkata");
  private static final String NO_BRANCH_CODE = "NO_BRANCH";
  private static final String NO_BRANCH_MESSAGE =
      "Select an outlet before recording a goods receipt.";

  private final PurchaseOrderRepository purchaseOrderRepository;
  private final PurchaseOrderLineRepository purchaseOrderLineRepository;
  private final GoodsReceiptRepository goodsReceiptRepository;
  private final GoodsReceiptLineRepository goodsReceiptLineRepository;
  private final SupplierRepository supplierRepository;
  private final LocationRepository locationRepository;
  private final AppUserRepository appUserRepository;
  private final AccessQueryService accessQueryService;
  private final AuditService auditService;
  private final Clock clock;

  public GoodsReceiptService(
      PurchaseOrderRepository purchaseOrderRepository,
      PurchaseOrderLineRepository purchaseOrderLineRepository,
      GoodsReceiptRepository goodsReceiptRepository,
      GoodsReceiptLineRepository goodsReceiptLineRepository,
      SupplierRepository supplierRepository,
      LocationRepository locationRepository,
      AppUserRepository appUserRepository,
      AccessQueryService accessQueryService,
      AuditService auditService,
      Clock clock) {
    this.purchaseOrderRepository = purchaseOrderRepository;
    this.purchaseOrderLineRepository = purchaseOrderLineRepository;
    this.goodsReceiptRepository = goodsReceiptRepository;
    this.goodsReceiptLineRepository = goodsReceiptLineRepository;
    this.supplierRepository = supplierRepository;
    this.locationRepository = locationRepository;
    this.appUserRepository = appUserRepository;
    this.accessQueryService = accessQueryService;
    this.auditService = auditService;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public GoodsReceiptsResult list(AuthPrincipal principal, UUID purchaseOrderId) {
    Context ctx = requireReady(principal);
    PurchaseOrder order = requireOrder(purchaseOrderId, ctx);
    List<PurchaseOrderLine> poLines = linesOf(order);
    List<GoodsReceipt> receipts =
        goodsReceiptRepository.findAllByPurchaseOrderIdAndTenantIdAndBranchIdOrderByCreatedAtAsc(
            order.getId(), ctx.tenantId(), ctx.branchId());
    Map<UUID, BigDecimal> received = receivedByPoLine(receipts, ctx);
    List<GoodsReceiptView> receiptViews =
        receipts.stream().map(row -> toView(row, linesOf(row))).toList();
    String supplierName =
        supplierRepository
            .findByIdAndTenantId(order.getSupplierId(), order.getTenantId())
            .map(Supplier::getLegalName)
            .orElse("");
    List<GoodsReceiptsResult.OutstandingLine> outstanding =
        poLines.stream()
            .map(
                line -> {
                  BigDecimal already = received.getOrDefault(line.getId(), BigDecimal.ZERO);
                  BigDecimal remaining = line.getQuantity().subtract(already);
                  if (remaining.signum() < 0) {
                    remaining = BigDecimal.ZERO;
                  }
                  return new GoodsReceiptsResult.OutstandingLine(
                      line.getId(),
                      line.getProductId(),
                      line.getProductName(),
                      line.getSku(),
                      strip(line.getQuantity()),
                      line.getUnitRatePaise(),
                      strip(already),
                      strip(remaining));
                })
            .toList();
    return new GoodsReceiptsResult(
        order.getId(),
        order.getPoNumber(),
        order.getStatus(),
        order.getSupplierId(),
        supplierName,
        outstanding,
        receiptViews);
  }

  @Transactional
  public GoodsReceiptView create(
      AuthPrincipal principal, UUID purchaseOrderId, CreateGoodsReceiptCommand command) {
    Context ctx = requireReady(principal);
    String key = requireIdempotencyKey(command.idempotencyKey());
    PurchaseOrder order =
        purchaseOrderRepository
            .lockByIdAndTenantIdAndBranchId(purchaseOrderId, ctx.tenantId(), ctx.branchId())
            .orElseThrow(GoodsReceiptService::notFound);
    return goodsReceiptRepository
        .findByTenantIdAndBranchIdAndIdempotencyKey(ctx.tenantId(), ctx.branchId(), key)
        .map(existing -> replayOrConflict(existing, order.getId()))
        .orElseGet(() -> insert(principal, ctx, order, command, key));
  }

  private GoodsReceiptView insert(
      AuthPrincipal principal,
      Context ctx,
      PurchaseOrder order,
      CreateGoodsReceiptCommand command,
      String key) {
    GoodsReceiptPolicy.assertIssued(order.getStatus());
    String reference = GoodsReceiptPolicy.requireReference(command.receiptReference());
    goodsReceiptRepository
        .findByTenantIdAndBranchIdAndReceiptReference(ctx.tenantId(), ctx.branchId(), reference)
        .ifPresent(
            existing -> {
              throw duplicateReceipt();
            });
    PurchaseOrderPolicy.requireLines(command.lines());
    Location branch = requireActiveBranch(ctx.tenantId(), ctx.branchId());
    List<PurchaseOrderLine> poLines = linesOf(order);
    Map<UUID, PurchaseOrderLine> poLineById = new HashMap<>();
    for (PurchaseOrderLine line : poLines) {
      poLineById.put(line.getId(), line);
    }
    List<GoodsReceipt> existingReceipts =
        goodsReceiptRepository.findAllByPurchaseOrderIdAndTenantIdAndBranchIdOrderByCreatedAtAsc(
            order.getId(), ctx.tenantId(), ctx.branchId());
    Map<UUID, BigDecimal> received = receivedByPoLine(existingReceipts, ctx);
    Instant now = clock.instant();
    List<GoodsReceiptLine> lines = new ArrayList<>();
    Set<UUID> seen = new LinkedHashSet<>();
    int sort = 0;
    for (CreateGoodsReceiptCommand.Line item : command.lines()) {
      if (item == null
          || item.purchaseOrderLineId() == null
          || !seen.add(item.purchaseOrderLineId())) {
        throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
      }
      PurchaseOrderLine poLine = poLineById.get(item.purchaseOrderLineId());
      if (poLine == null) {
        throw notFound();
      }
      BigDecimal qty = GoodsReceiptPolicy.assertQuantity(item.quantity());
      if (item.unitRatePaise() == null) {
        throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
      }
      GoodsReceiptPolicy.assertPriceMatch(poLine.getUnitRatePaise(), item.unitRatePaise());
      BigDecimal outstanding =
          poLine.getQuantity().subtract(received.getOrDefault(poLine.getId(), BigDecimal.ZERO));
      GoodsReceiptPolicy.assertNotOverReceipt(qty, outstanding);
      received.put(poLine.getId(), received.getOrDefault(poLine.getId(), BigDecimal.ZERO).add(qty));
      GoodsReceiptLine line = new GoodsReceiptLine();
      line.setId(UUID.randomUUID());
      line.setTenantId(order.getTenantId());
      line.setBranchId(order.getBranchId());
      line.setPurchaseOrderLineId(poLine.getId());
      line.setProductId(poLine.getProductId());
      line.setProductName(poLine.getProductName());
      line.setSku(poLine.getSku());
      line.setQuantity(qty);
      line.setUnitRatePaise(item.unitRatePaise());
      line.setSortOrder(sort++);
      line.setCreatedAt(now);
      lines.add(line);
    }
    GoodsReceipt receipt = new GoodsReceipt();
    receipt.setId(UUID.randomUUID());
    receipt.setTenantId(order.getTenantId());
    receipt.setBranchId(order.getBranchId());
    receipt.setPurchaseOrderId(order.getId());
    receipt.setSupplierId(order.getSupplierId());
    receipt.setReceiptNumber(nextReceiptNumber(ctx, branch, now));
    receipt.setReceiptReference(reference);
    receipt.setStatus(GoodsReceiptStatus.PENDING_QC);
    receipt.setIdempotencyKey(key);
    receipt.setCreatedByUserId(principal.userId());
    receipt.setCreatedAt(now);
    for (GoodsReceiptLine line : lines) {
      line.setGoodsReceiptId(receipt.getId());
    }
    try {
      goodsReceiptRepository.saveAndFlush(receipt);
      goodsReceiptLineRepository.saveAllAndFlush(lines);
    } catch (DataIntegrityViolationException ex) {
      if (causedBy(ex, "uq_goods_receipt_tenant_branch_idempotency")) {
        return goodsReceiptRepository
            .findByTenantIdAndBranchIdAndIdempotencyKey(ctx.tenantId(), ctx.branchId(), key)
            .map(existing -> replayOrConflict(existing, order.getId()))
            .orElseThrow(() -> ex);
      }
      if (causedBy(ex, "uq_goods_receipt_tenant_branch_reference")) {
        throw duplicateReceipt();
      }
      throw ex;
    }
    audit(principal, receipt.getId(), order.getId());
    return toView(receipt, lines);
  }

  private Map<UUID, BigDecimal> receivedByPoLine(List<GoodsReceipt> receipts, Context ctx) {
    Map<UUID, BigDecimal> received = new HashMap<>();
    if (receipts.isEmpty()) {
      return received;
    }
    List<UUID> ids = receipts.stream().map(GoodsReceipt::getId).toList();
    for (GoodsReceiptLine line :
        goodsReceiptLineRepository
            .findAllByGoodsReceiptIdInAndTenantIdAndBranchIdOrderBySortOrderAsc(
                ids, ctx.tenantId(), ctx.branchId())) {
      received.merge(line.getPurchaseOrderLineId(), line.getQuantity(), BigDecimal::add);
    }
    return received;
  }

  private GoodsReceiptView replayOrConflict(GoodsReceipt existing, UUID purchaseOrderId) {
    if (!existing.getPurchaseOrderId().equals(purchaseOrderId)) {
      throw new ApiException(
          HttpStatus.CONFLICT, "DUPLICATE_RECEIPT", "This delivery key is already used.");
    }
    return toView(existing, linesOf(existing));
  }

  private String nextReceiptNumber(Context ctx, Location branch, Instant now) {
    LocalDate ist = LocalDate.ofInstant(now, IST);
    String fy = GoodsReceiptPolicy.financialYear(ist);
    String prefix = "GRN/" + fy + "/" + branch.getBranchCode() + "/";
    int seq =
        (int)
                goodsReceiptRepository.countByTenantIdAndBranchIdAndReceiptNumberStartingWith(
                    ctx.tenantId(), ctx.branchId(), prefix)
            + 1;
    return GoodsReceiptPolicy.receiptNumber(fy, branch.getBranchCode(), seq);
  }

  private List<PurchaseOrderLine> linesOf(PurchaseOrder order) {
    return purchaseOrderLineRepository
        .findAllByPurchaseOrderIdAndTenantIdAndBranchIdOrderBySortOrderAsc(
            order.getId(), order.getTenantId(), order.getBranchId());
  }

  private List<GoodsReceiptLine> linesOf(GoodsReceipt receipt) {
    return goodsReceiptLineRepository
        .findAllByGoodsReceiptIdAndTenantIdAndBranchIdOrderBySortOrderAsc(
            receipt.getId(), receipt.getTenantId(), receipt.getBranchId());
  }

  private GoodsReceiptView toView(GoodsReceipt receipt, List<GoodsReceiptLine> lines) {
    return new GoodsReceiptView(
        receipt.getId(),
        receipt.getReceiptNumber(),
        receipt.getReceiptReference(),
        receipt.getStatus(),
        receipt.getCreatedAt(),
        lines.stream()
            .map(
                line ->
                    new GoodsReceiptView.LineView(
                        line.getPurchaseOrderLineId(),
                        line.getProductId(),
                        line.getProductName(),
                        line.getSku(),
                        strip(line.getQuantity()),
                        line.getUnitRatePaise()))
            .toList());
  }

  private static BigDecimal strip(BigDecimal value) {
    if (value == null) {
      return BigDecimal.ZERO;
    }
    BigDecimal stripped = value.stripTrailingZeros();
    if (stripped.scale() < 0) {
      return stripped.setScale(0);
    }
    return stripped;
  }

  private PurchaseOrder requireOrder(UUID id, Context ctx) {
    return purchaseOrderRepository
        .findByIdAndTenantIdAndBranchId(id, ctx.tenantId(), ctx.branchId())
        .orElseThrow(GoodsReceiptService::notFound);
  }

  private Location requireActiveBranch(UUID tenantId, UUID branchId) {
    Location branch =
        locationRepository
            .findByIdAndTenantIdAndDeletedAtIsNull(branchId, tenantId)
            .orElseThrow(GoodsReceiptService::notFound);
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
            .orElseThrow(GoodsReceiptService::forbidden);
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

  private void audit(AuthPrincipal principal, UUID receiptId, UUID purchaseOrderId) {
    auditService.record(
        new AuditRecordCommand(
            principal.userId(),
            principal.tenantId(),
            principal.activeBranchId(),
            "GOODS_RECEIPT_CREATE",
            AuditService.OUTCOME_SUCCESS,
            null,
            null,
            null,
            principal.sessionId(),
            "{\"goodsReceiptId\":\""
                + receiptId
                + "\",\"purchaseOrderId\":\""
                + purchaseOrderId
                + "\"}"));
  }

  private static boolean causedBy(Throwable ex, String constraint) {
    Throwable current = ex;
    while (current != null) {
      String message = current.getMessage();
      if (message != null && message.contains(constraint)) {
        return true;
      }
      current = current.getCause();
    }
    return false;
  }

  private static ApiException duplicateReceipt() {
    return new ApiException(
        HttpStatus.CONFLICT,
        GoodsReceiptPolicy.DUPLICATE_RECEIPT,
        "This challan is already recorded.");
  }

  private static ApiException notFound() {
    return new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Purchase order was not found");
  }

  private static ApiException forbidden() {
    return new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Forbidden");
  }

  private record Context(UUID tenantId, UUID branchId) {}
}
