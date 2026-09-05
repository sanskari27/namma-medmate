package com.nammamedmate.server.application.purchasereturn;

import com.nammamedmate.server.application.access.AccessQueryService;
import com.nammamedmate.server.application.audit.AuditRecordCommand;
import com.nammamedmate.server.application.audit.AuditService;
import com.nammamedmate.server.application.inventory.InventoryStockService;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.GoodsReceipt;
import com.nammamedmate.server.domain.GoodsReceiptLine;
import com.nammamedmate.server.domain.GoodsReceiptStatus;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.ModuleCode;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.PurchaseOrderPolicy;
import com.nammamedmate.server.domain.PurchaseReturn;
import com.nammamedmate.server.domain.PurchaseReturnLine;
import com.nammamedmate.server.domain.PurchaseReturnOrigin;
import com.nammamedmate.server.domain.PurchaseReturnPolicy;
import com.nammamedmate.server.domain.PurchaseReturnStatus;
import com.nammamedmate.server.domain.StockMovement;
import com.nammamedmate.server.domain.Supplier;
import com.nammamedmate.server.domain.TenantSubscription;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.GoodsReceiptLineRepository;
import com.nammamedmate.server.persistence.GoodsReceiptRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.PurchaseReturnLineRepository;
import com.nammamedmate.server.persistence.PurchaseReturnRepository;
import com.nammamedmate.server.persistence.StockMovementRepository;
import com.nammamedmate.server.persistence.SupplierRepository;
import com.nammamedmate.server.persistence.TenantSubscriptionRepository;
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
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PurchaseReturnService {

  private static final ZoneId IST = ZoneId.of("Asia/Kolkata");
  private static final String NO_BRANCH_CODE = "NO_ACTIVE_BRANCH";
  private static final String NO_BRANCH_MESSAGE = "Select an outlet before recording a return.";

  private final PurchaseReturnRepository purchaseReturnRepository;
  private final PurchaseReturnLineRepository purchaseReturnLineRepository;
  private final GoodsReceiptRepository goodsReceiptRepository;
  private final GoodsReceiptLineRepository goodsReceiptLineRepository;
  private final StockMovementRepository stockMovementRepository;
  private final SupplierRepository supplierRepository;
  private final LocationRepository locationRepository;
  private final AppUserRepository appUserRepository;
  private final TenantSubscriptionRepository tenantSubscriptionRepository;
  private final AccessQueryService accessQueryService;
  private final InventoryStockService inventoryStockService;
  private final SupplierLedgerService supplierLedgerService;
  private final AuditService auditService;
  private final Clock clock;

  public PurchaseReturnService(
      PurchaseReturnRepository purchaseReturnRepository,
      PurchaseReturnLineRepository purchaseReturnLineRepository,
      GoodsReceiptRepository goodsReceiptRepository,
      GoodsReceiptLineRepository goodsReceiptLineRepository,
      StockMovementRepository stockMovementRepository,
      SupplierRepository supplierRepository,
      LocationRepository locationRepository,
      AppUserRepository appUserRepository,
      TenantSubscriptionRepository tenantSubscriptionRepository,
      AccessQueryService accessQueryService,
      InventoryStockService inventoryStockService,
      SupplierLedgerService supplierLedgerService,
      AuditService auditService,
      Clock clock) {
    this.purchaseReturnRepository = purchaseReturnRepository;
    this.purchaseReturnLineRepository = purchaseReturnLineRepository;
    this.goodsReceiptRepository = goodsReceiptRepository;
    this.goodsReceiptLineRepository = goodsReceiptLineRepository;
    this.stockMovementRepository = stockMovementRepository;
    this.supplierRepository = supplierRepository;
    this.locationRepository = locationRepository;
    this.appUserRepository = appUserRepository;
    this.tenantSubscriptionRepository = tenantSubscriptionRepository;
    this.accessQueryService = accessQueryService;
    this.inventoryStockService = inventoryStockService;
    this.supplierLedgerService = supplierLedgerService;
    this.auditService = auditService;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public PurchaseReturnListResult list(AuthPrincipal principal) {
    Context ctx = requireFloorAccess(principal);
    List<PurchaseReturn> rows =
        purchaseReturnRepository.findAllByTenantIdAndBranchIdOrderByCreatedAtDesc(
            ctx.tenantId(), ctx.branchId());
    return new PurchaseReturnListResult(
        rows.stream().map(row -> toSummary(row, supplierName(row))).toList());
  }

  @Transactional(readOnly = true)
  public PurchaseReturnView get(AuthPrincipal principal, UUID id) {
    Context ctx = requireFloorAccess(principal);
    PurchaseReturn row =
        purchaseReturnRepository
            .findByIdAndTenantIdAndBranchId(id, ctx.tenantId(), ctx.branchId())
            .orElseThrow(PurchaseReturnService::notFound);
    return toView(row, linesOf(row), supplierName(row));
  }

  @Transactional(readOnly = true)
  public Optional<PurchaseReturnView> findQcReturn(
      UUID tenantId, UUID branchId, UUID goodsReceiptId) {
    return purchaseReturnRepository
        .findByTenantIdAndBranchIdAndGoodsReceiptIdAndOrigin(
            tenantId, branchId, goodsReceiptId, PurchaseReturnOrigin.QC)
        .map(row -> toView(row, linesOf(row), supplierName(row)));
  }

  @Transactional(readOnly = true)
  public SupplierLedgerView ledger(AuthPrincipal principal, UUID supplierId) {
    Context ctx = requireFloorAccess(principal);
    Supplier supplier = requireSupplier(supplierId, ctx.tenantId());
    return supplierLedgerService.get(
        ctx.tenantId(), ctx.branchId(), supplier.getId(), supplier.getLegalName());
  }

  @Transactional(readOnly = true)
  public SupplierDueListResult dues(AuthPrincipal principal) {
    Context ctx = requireFloorAccess(principal);
    PurchaseReturnPolicy.assertDueRemindersEntitled(currentPlan(ctx.tenantId()));
    LocalDate today = LocalDate.ofInstant(clock.instant(), IST);
    return supplierLedgerService.dues(ctx.tenantId(), ctx.branchId(), today);
  }

  @Transactional
  public SupplierLedgerView pay(
      AuthPrincipal principal, UUID supplierId, SupplierPaymentCommand command) {
    Context ctx = requireFloorAccess(principal);
    Supplier supplier = requireSupplier(supplierId, ctx.tenantId());
    String key = PurchaseReturnPolicy.requireIdempotencyKey(command.idempotencyKey());
    String mode = PurchaseReturnPolicy.requirePaymentMode(command.mode());
    String reference = PurchaseReturnPolicy.requirePaymentReference(command.reference());
    Instant now = clock.instant();
    supplierLedgerService.postPayment(
        ctx.tenantId(),
        ctx.branchId(),
        supplier.getId(),
        command.amountPaise(),
        mode,
        reference,
        key,
        principal.userId(),
        now,
        command.expectedAccountVersion());
    audit(principal, "SUPPLIER_PAYMENT", supplier.getId());
    return supplierLedgerService.get(
        ctx.tenantId(), ctx.branchId(), supplier.getId(), supplier.getLegalName());
  }

  @Transactional
  public PurchaseReturnView create(AuthPrincipal principal, PurchaseReturnCommand command) {
    Context ctx = requireFloorAccess(principal);
    String key = PurchaseReturnPolicy.requireIdempotencyKey(command.idempotencyKey());
    PurchaseReturn existing =
        purchaseReturnRepository
            .findByTenantIdAndBranchIdAndIdempotencyKey(ctx.tenantId(), ctx.branchId(), key)
            .orElse(null);
    if (existing != null) {
      return replayOrConflict(existing, command);
    }
    if (command.goodsReceiptId() == null) {
      throw validationError();
    }
    PurchaseReturnPolicy.assertLinesPresent(command.lines());
    GoodsReceipt receipt =
        goodsReceiptRepository
            .lockByIdAndTenantIdAndBranchId(
                command.goodsReceiptId(), ctx.tenantId(), ctx.branchId())
            .orElseThrow(PurchaseReturnService::receiptNotFound);
    if (receipt.getStatus() != GoodsReceiptStatus.CHECKED) {
      throw new ApiException(
          HttpStatus.CONFLICT,
          PurchaseReturnPolicy.STALE_STATE,
          "Send packs back only after this delivery has been checked.");
    }
    List<GoodsReceiptLine> receiptLines = receiptLines(receipt);
    Map<UUID, GoodsReceiptLine> byId = new HashMap<>();
    for (GoodsReceiptLine line : receiptLines) {
      byId.put(line.getId(), line);
    }
    Instant now = clock.instant();
    List<PurchaseReturnLine> lines = new ArrayList<>();
    long total = 0L;
    int sort = 0;
    Set<UUID> seen = new LinkedHashSet<>();
    for (PurchaseReturnCommand.Line item : command.lines()) {
      if (item == null
          || item.goodsReceiptLineId() == null
          || !seen.add(item.goodsReceiptLineId())) {
        throw validationError();
      }
      GoodsReceiptLine source = byId.get(item.goodsReceiptLineId());
      if (source == null) {
        throw validationError();
      }
      BigDecimal qty = PurchaseReturnPolicy.assertQuantity(item.quantity());
      BigDecimal remaining = remainingReturnable(ctx, source);
      PurchaseReturnPolicy.assertReturnable(remaining, qty);
      UUID batchId = batchIdOf(source);
      String stockKey = "pr:" + key + ":" + source.getId();
      inventoryStockService.returnToSupplier(
          principal, source.getProductId(), batchId, qty, stockKey, null);
      UUID movementId =
          stockMovementRepository
              .findByTenantIdAndIdempotencyKey(ctx.tenantId(), stockKey)
              .map(StockMovement::getId)
              .orElse(null);
      long amount = PurchaseReturnPolicy.lineAmountPaise(qty, source.getUnitRatePaise());
      total += amount;
      PurchaseReturnLine line = new PurchaseReturnLine();
      line.setId(UUID.randomUUID());
      line.setTenantId(ctx.tenantId());
      line.setBranchId(ctx.branchId());
      line.setGoodsReceiptLineId(source.getId());
      line.setProductId(source.getProductId());
      line.setProductName(source.getProductName());
      line.setSku(source.getSku());
      line.setBatchId(batchId);
      line.setQuantity(qty);
      line.setUnitRatePaise(source.getUnitRatePaise());
      line.setAmountPaise(amount);
      line.setStockMovementId(movementId);
      line.setSortOrder(sort++);
      line.setCreatedAt(now);
      lines.add(line);
    }
    PurchaseReturn saved =
        persistReturn(
            ctx,
            receipt.getSupplierId(),
            receipt.getId(),
            PurchaseReturnOrigin.MANUAL,
            key,
            total,
            lines,
            principal.userId(),
            now);
    supplierLedgerService.postDebitNote(
        ctx.tenantId(),
        ctx.branchId(),
        receipt.getSupplierId(),
        total,
        saved.getId(),
        "dn:" + saved.getId(),
        principal.userId(),
        now,
        command.expectedAccountVersion());
    audit(principal, "PURCHASE_RETURN", saved.getId());
    return toView(saved, linesOf(saved), supplierName(saved));
  }

  @Transactional
  public Optional<PurchaseReturnView> recordFromQualityCheck(
      AuthPrincipal principal, GoodsReceipt receipt, List<GoodsReceiptLine> receiptLines) {
    Context ctx = new Context(receipt.getTenantId(), receipt.getBranchId());
    Instant now = clock.instant();
    long invoiceAmount = 0L;
    List<GoodsReceiptLine> rejected = new ArrayList<>();
    for (GoodsReceiptLine line : receiptLines) {
      invoiceAmount +=
          PurchaseReturnPolicy.lineAmountPaise(strip(line.getQuantity()), line.getUnitRatePaise());
      if (line.getRejectedQuantity() != null && line.getRejectedQuantity().signum() > 0) {
        rejected.add(line);
      }
    }
    Supplier supplier = requireSupplier(receipt.getSupplierId(), ctx.tenantId());
    LocalDate invoiceDate = LocalDate.ofInstant(now, IST);
    supplierLedgerService.postInvoice(
        ctx.tenantId(),
        ctx.branchId(),
        receipt.getSupplierId(),
        invoiceAmount,
        receipt.getId(),
        PurchaseReturnPolicy.dueOn(
            invoiceDate, supplier.getPaymentTerms(), supplier.getCreditPeriodDays()),
        "grn:" + receipt.getId() + ":invoice",
        principal.userId(),
        now);
    if (rejected.isEmpty()) {
      return Optional.empty();
    }
    String key = "qc:" + receipt.getId();
    Optional<PurchaseReturn> existing =
        purchaseReturnRepository.findByTenantIdAndBranchIdAndIdempotencyKey(
            ctx.tenantId(), ctx.branchId(), key);
    if (existing.isPresent()) {
      PurchaseReturn row = existing.get();
      return Optional.of(toView(row, linesOf(row), supplierName(row)));
    }
    List<PurchaseReturnLine> lines = new ArrayList<>();
    long total = 0L;
    int sort = 0;
    for (GoodsReceiptLine source : rejected) {
      BigDecimal qty = strip(source.getRejectedQuantity());
      long amount = PurchaseReturnPolicy.lineAmountPaise(qty, source.getUnitRatePaise());
      total += amount;
      PurchaseReturnLine line = new PurchaseReturnLine();
      line.setId(UUID.randomUUID());
      line.setTenantId(ctx.tenantId());
      line.setBranchId(ctx.branchId());
      line.setGoodsReceiptLineId(source.getId());
      line.setProductId(source.getProductId());
      line.setProductName(source.getProductName());
      line.setSku(source.getSku());
      line.setBatchId(null);
      line.setQuantity(qty);
      line.setUnitRatePaise(source.getUnitRatePaise());
      line.setAmountPaise(amount);
      line.setStockMovementId(null);
      line.setSortOrder(sort++);
      line.setCreatedAt(now);
      lines.add(line);
    }
    PurchaseReturn saved =
        persistReturn(
            ctx,
            receipt.getSupplierId(),
            receipt.getId(),
            PurchaseReturnOrigin.QC,
            key,
            total,
            lines,
            principal.userId(),
            now);
    supplierLedgerService.postDebitNote(
        ctx.tenantId(),
        ctx.branchId(),
        receipt.getSupplierId(),
        total,
        saved.getId(),
        "dn:" + saved.getId(),
        principal.userId(),
        now,
        null);
    audit(principal, "PURCHASE_RETURN", saved.getId());
    return Optional.of(toView(saved, linesOf(saved), supplierName(saved)));
  }

  private PurchaseReturn persistReturn(
      Context ctx,
      UUID supplierId,
      UUID goodsReceiptId,
      PurchaseReturnOrigin origin,
      String key,
      long total,
      List<PurchaseReturnLine> lines,
      UUID userId,
      Instant now) {
    Location branch =
        locationRepository
            .findByIdAndTenantIdAndDeletedAtIsNull(ctx.branchId(), ctx.tenantId())
            .orElseThrow(PurchaseReturnService::notFound);
    LocalDate istDate = LocalDate.ofInstant(now, IST);
    String fy = PurchaseOrderPolicy.financialYear(istDate);
    String prefix = "DN/" + fy + "/" + branch.getBranchCode() + "/";
    int seq =
        (int)
                purchaseReturnRepository.countByTenantIdAndBranchIdAndDebitNoteNumberStartingWith(
                    ctx.tenantId(), ctx.branchId(), prefix)
            + 1;
    PurchaseReturn row = new PurchaseReturn();
    row.setId(UUID.randomUUID());
    row.setTenantId(ctx.tenantId());
    row.setBranchId(ctx.branchId());
    row.setSupplierId(supplierId);
    row.setGoodsReceiptId(goodsReceiptId);
    row.setOrigin(origin);
    row.setStatus(PurchaseReturnStatus.CONFIRMED);
    row.setDebitNoteNumber(PurchaseReturnPolicy.debitNoteNumber(fy, branch.getBranchCode(), seq));
    row.setAmountPaise(total);
    row.setIdempotencyKey(key);
    row.setCreatedByUserId(userId);
    row.setCreatedAt(now);
    try {
      purchaseReturnRepository.saveAndFlush(row);
    } catch (DataIntegrityViolationException ex) {
      if (causedBy(ex, "uq_purchase_return_tenant_branch_idempotency")
          || causedBy(ex, "uq_purchase_return_qc_receipt")) {
        return purchaseReturnRepository
            .findByTenantIdAndBranchIdAndIdempotencyKey(ctx.tenantId(), ctx.branchId(), key)
            .orElseThrow(() -> PurchaseReturnPolicy.idempotencyConflict());
      }
      throw ex;
    }
    for (PurchaseReturnLine line : lines) {
      line.setPurchaseReturnId(row.getId());
    }
    purchaseReturnLineRepository.saveAllAndFlush(lines);
    return row;
  }

  private PurchaseReturnView replayOrConflict(
      PurchaseReturn existing, PurchaseReturnCommand command) {
    if (command.goodsReceiptId() == null
        || !command.goodsReceiptId().equals(existing.getGoodsReceiptId())
        || existing.getOrigin() != PurchaseReturnOrigin.MANUAL) {
      throw PurchaseReturnPolicy.idempotencyConflict();
    }
    List<PurchaseReturnLine> lines = linesOf(existing);
    if (command.lines() == null || command.lines().size() != lines.size()) {
      throw PurchaseReturnPolicy.idempotencyConflict();
    }
    Map<UUID, BigDecimal> requested = new HashMap<>();
    for (PurchaseReturnCommand.Line item : command.lines()) {
      if (item == null || item.goodsReceiptLineId() == null) {
        throw PurchaseReturnPolicy.idempotencyConflict();
      }
      requested.put(item.goodsReceiptLineId(), item.quantity());
    }
    for (PurchaseReturnLine line : lines) {
      BigDecimal qty = requested.get(line.getGoodsReceiptLineId());
      if (qty == null || line.getQuantity().compareTo(qty) != 0) {
        throw PurchaseReturnPolicy.idempotencyConflict();
      }
    }
    return toView(existing, lines, supplierName(existing));
  }

  private BigDecimal remainingReturnable(Context ctx, GoodsReceiptLine source) {
    BigDecimal accepted =
        source.getAcceptedQuantity() == null
            ? BigDecimal.ZERO
            : strip(source.getAcceptedQuantity());
    BigDecimal used = BigDecimal.ZERO;
    for (PurchaseReturnLine prior :
        purchaseReturnLineRepository.findAllByTenantIdAndBranchIdAndGoodsReceiptLineId(
            ctx.tenantId(), ctx.branchId(), source.getId())) {
      PurchaseReturn parent =
          purchaseReturnRepository
              .findByIdAndTenantIdAndBranchId(
                  prior.getPurchaseReturnId(), ctx.tenantId(), ctx.branchId())
              .orElse(null);
      if (parent == null || parent.getOrigin() != PurchaseReturnOrigin.MANUAL) {
        continue;
      }
      used = used.add(prior.getQuantity());
    }
    return accepted.subtract(used);
  }

  private UUID batchIdOf(GoodsReceiptLine source) {
    if (source.getStockMovementId() == null) {
      return null;
    }
    return stockMovementRepository
        .findById(source.getStockMovementId())
        .filter(movement -> movement.getTenantId().equals(source.getTenantId()))
        .filter(movement -> movement.getBranchId().equals(source.getBranchId()))
        .map(StockMovement::getBatchId)
        .orElse(null);
  }

  private List<GoodsReceiptLine> receiptLines(GoodsReceipt receipt) {
    return goodsReceiptLineRepository
        .findAllByGoodsReceiptIdAndTenantIdAndBranchIdOrderBySortOrderAsc(
            receipt.getId(), receipt.getTenantId(), receipt.getBranchId());
  }

  private List<PurchaseReturnLine> linesOf(PurchaseReturn row) {
    return purchaseReturnLineRepository
        .findAllByPurchaseReturnIdAndTenantIdAndBranchIdOrderBySortOrderAsc(
            row.getId(), row.getTenantId(), row.getBranchId());
  }

  private PurchaseReturnListResult.Summary toSummary(PurchaseReturn row, String supplierName) {
    return new PurchaseReturnListResult.Summary(
        row.getId(),
        row.getDebitNoteNumber(),
        row.getOrigin().name(),
        row.getStatus().name(),
        row.getSupplierId(),
        supplierName,
        row.getAmountPaise(),
        row.getCreatedAt());
  }

  private PurchaseReturnView toView(
      PurchaseReturn row, List<PurchaseReturnLine> lines, String supplierName) {
    return new PurchaseReturnView(
        row.getId(),
        row.getDebitNoteNumber(),
        row.getOrigin(),
        row.getStatus(),
        row.getSupplierId(),
        supplierName,
        row.getGoodsReceiptId(),
        row.getAmountPaise(),
        row.getCreatedAt(),
        lines.stream()
            .map(
                line ->
                    new PurchaseReturnView.LineView(
                        line.getId(),
                        line.getGoodsReceiptLineId(),
                        line.getProductId(),
                        line.getProductName(),
                        line.getSku(),
                        line.getBatchId(),
                        strip(line.getQuantity()),
                        line.getUnitRatePaise(),
                        line.getAmountPaise(),
                        line.getStockMovementId()))
            .toList());
  }

  private String supplierName(PurchaseReturn row) {
    return supplierRepository
        .findByIdAndTenantId(row.getSupplierId(), row.getTenantId())
        .map(Supplier::getLegalName)
        .orElse("");
  }

  private Supplier requireSupplier(UUID supplierId, UUID tenantId) {
    return supplierRepository
        .findByIdAndTenantId(supplierId, tenantId)
        .orElseThrow(
            () -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Supplier was not found"));
  }

  private PlanCode currentPlan(UUID tenantId) {
    return tenantSubscriptionRepository
        .findByTenantId(tenantId)
        .map(TenantSubscription::getPlanCode)
        .orElse(PlanCode.FREE);
  }

  private Context requireFloorAccess(AuthPrincipal principal) {
    AppUser user = requireUser(principal);
    Set<ModuleCode> modules = accessQueryService.effectiveModules(user);
    if (!modules.contains(ModuleCode.PROCUREMENT) && !modules.contains(ModuleCode.FINANCE)) {
      throw forbidden();
    }
    UUID branchId = principal.activeBranchId();
    if (branchId == null) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, NO_BRANCH_CODE, NO_BRANCH_MESSAGE);
    }
    return new Context(principal.tenantId(), branchId);
  }

  private AppUser requireUser(AuthPrincipal principal) {
    if (principal == null || principal.tenantId() == null) {
      throw forbidden();
    }
    if (principal.role() != AppUserRole.pharmacy_owner
        && principal.role() != AppUserRole.pharmacy_staff) {
      throw forbidden();
    }
    return appUserRepository
        .findById(principal.userId())
        .filter(row -> row.getDeletedAt() == null)
        .orElseThrow(PurchaseReturnService::forbidden);
  }

  private void audit(AuthPrincipal principal, String action, UUID entityId) {
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
            "{\"id\":\"" + entityId + "\"}"));
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

  private static ApiException validationError() {
    return new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
  }

  private static ApiException notFound() {
    return new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Purchase return was not found");
  }

  private static ApiException receiptNotFound() {
    return new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Goods receipt was not found");
  }

  private static ApiException forbidden() {
    return new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Forbidden");
  }

  private record Context(UUID tenantId, UUID branchId) {}
}
