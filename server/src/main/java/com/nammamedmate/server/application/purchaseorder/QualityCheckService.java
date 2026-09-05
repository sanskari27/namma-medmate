package com.nammamedmate.server.application.purchaseorder;

import com.nammamedmate.server.application.access.AccessQueryService;
import com.nammamedmate.server.application.audit.AuditRecordCommand;
import com.nammamedmate.server.application.audit.AuditService;
import com.nammamedmate.server.application.inventory.InventoryStockService;
import com.nammamedmate.server.application.purchasereturn.PurchaseReturnService;
import com.nammamedmate.server.application.purchasereturn.PurchaseReturnView;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.GoodsReceipt;
import com.nammamedmate.server.domain.GoodsReceiptLine;
import com.nammamedmate.server.domain.GoodsReceiptStatus;
import com.nammamedmate.server.domain.ModuleCode;
import com.nammamedmate.server.domain.Product;
import com.nammamedmate.server.domain.QualityCheckPolicy;
import com.nammamedmate.server.domain.StockMovement;
import com.nammamedmate.server.domain.Supplier;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.GoodsReceiptLineRepository;
import com.nammamedmate.server.persistence.GoodsReceiptRepository;
import com.nammamedmate.server.persistence.ProductRepository;
import com.nammamedmate.server.persistence.StockMovementRepository;
import com.nammamedmate.server.persistence.SupplierRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class QualityCheckService {

  private static final String NO_BRANCH_CODE = "NO_ACTIVE_BRANCH";
  private static final String NO_BRANCH_MESSAGE = "Select an outlet before checking a delivery.";

  private final GoodsReceiptRepository goodsReceiptRepository;
  private final GoodsReceiptLineRepository goodsReceiptLineRepository;
  private final ProductRepository productRepository;
  private final SupplierRepository supplierRepository;
  private final StockMovementRepository stockMovementRepository;
  private final AppUserRepository appUserRepository;
  private final AccessQueryService accessQueryService;
  private final InventoryStockService inventoryStockService;
  private final PurchaseReturnService purchaseReturnService;
  private final AuditService auditService;
  private final Clock clock;

  public QualityCheckService(
      GoodsReceiptRepository goodsReceiptRepository,
      GoodsReceiptLineRepository goodsReceiptLineRepository,
      ProductRepository productRepository,
      SupplierRepository supplierRepository,
      StockMovementRepository stockMovementRepository,
      AppUserRepository appUserRepository,
      AccessQueryService accessQueryService,
      InventoryStockService inventoryStockService,
      PurchaseReturnService purchaseReturnService,
      AuditService auditService,
      Clock clock) {
    this.goodsReceiptRepository = goodsReceiptRepository;
    this.goodsReceiptLineRepository = goodsReceiptLineRepository;
    this.productRepository = productRepository;
    this.supplierRepository = supplierRepository;
    this.stockMovementRepository = stockMovementRepository;
    this.appUserRepository = appUserRepository;
    this.accessQueryService = accessQueryService;
    this.inventoryStockService = inventoryStockService;
    this.purchaseReturnService = purchaseReturnService;
    this.auditService = auditService;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public QualityCheckListResult list(AuthPrincipal principal) {
    Context ctx = requireFloorAccess(principal);
    List<GoodsReceipt> receipts =
        goodsReceiptRepository.findAllByTenantIdAndBranchIdOrderByCreatedAtDesc(
            ctx.tenantId(), ctx.branchId());
    return new QualityCheckListResult(
        receipts.stream().map(row -> toSummary(row, supplierName(row))).toList());
  }

  @Transactional(readOnly = true)
  public QualityCheckView get(AuthPrincipal principal, UUID id) {
    Context ctx = requireFloorAccess(principal);
    GoodsReceipt receipt =
        goodsReceiptRepository
            .findByIdAndTenantIdAndBranchId(id, ctx.tenantId(), ctx.branchId())
            .orElseThrow(QualityCheckService::notFound);
    return toView(receipt, linesOf(receipt));
  }

  @Transactional
  public QualityCheckView check(AuthPrincipal principal, UUID id, QualityCheckCommand command) {
    Context ctx = requirePharmacist(principal);
    String key = requireIdempotencyKey(command.idempotencyKey());
    GoodsReceipt receipt =
        goodsReceiptRepository
            .lockByIdAndTenantIdAndBranchId(id, ctx.tenantId(), ctx.branchId())
            .orElseThrow(QualityCheckService::notFound);
    if (receipt.getStatus() == GoodsReceiptStatus.CHECKED) {
      return replayOrConflict(receipt, command, key);
    }
    QualityCheckPolicy.assertPending(receipt.getStatus());
    return apply(principal, ctx, receipt, command, key);
  }

  private QualityCheckView apply(
      AuthPrincipal principal,
      Context ctx,
      GoodsReceipt receipt,
      QualityCheckCommand command,
      String key) {
    if (command.visualInspectionPassed() == null || command.checklist() == null) {
      throw validationError();
    }
    if (command.lines() == null || command.lines().isEmpty()) {
      throw validationError();
    }
    List<GoodsReceiptLine> lines = linesOf(receipt);
    Map<UUID, QualityCheckCommand.Line> byId = new HashMap<>();
    Set<UUID> seen = new LinkedHashSet<>();
    for (QualityCheckCommand.Line item : command.lines()) {
      if (item == null
          || item.goodsReceiptLineId() == null
          || !seen.add(item.goodsReceiptLineId())) {
        throw validationError();
      }
      byId.put(item.goodsReceiptLineId(), item);
    }
    if (byId.size() != lines.size()) {
      throw validationError();
    }
    QualityCheckCommand.Checklist checklist = command.checklist();
    boolean acceptingAny = false;
    Map<UUID, Product> products = new HashMap<>();
    LocalDate today = LocalDate.ofInstant(clock.instant(), ZoneOffset.UTC);
    for (GoodsReceiptLine line : lines) {
      QualityCheckCommand.Line item = byId.get(line.getId());
      if (item == null) {
        throw validationError();
      }
      QualityCheckPolicy.assertQuantities(
          line.getQuantity(), item.acceptedQuantity(), item.rejectedQuantity());
      if (item.acceptedQuantity().signum() > 0) {
        acceptingAny = true;
      }
      Product product =
          productRepository
              .findByIdAndTenantId(line.getProductId(), receipt.getTenantId())
              .orElseThrow(QualityCheckService::notFound);
      products.put(line.getId(), product);
      QualityCheckPolicy.assertExpiry(
          item.acceptedQuantity().signum() > 0,
          product.isRequiresBatchTracking(),
          item.expiresOn(),
          today);
      if (item.acceptedQuantity().signum() > 0
          && product.isRequiresBatchTracking()
          && blank(item.batchNumber())) {
        throw validationError();
      }
    }
    QualityCheckPolicy.assertChecklistWhenAccepting(
        acceptingAny,
        Boolean.TRUE.equals(command.visualInspectionPassed()),
        Boolean.TRUE.equals(checklist.packagingIntact()),
        Boolean.TRUE.equals(checklist.labelMatches()),
        Boolean.TRUE.equals(checklist.batchReadable()),
        Boolean.TRUE.equals(checklist.noDamage()));
    Instant now = clock.instant();
    for (GoodsReceiptLine line : lines) {
      QualityCheckCommand.Line item = byId.get(line.getId());
      Product product = products.get(line.getId());
      UUID movementId = null;
      if (item.acceptedQuantity().signum() > 0) {
        String stockKey = "qc:" + receipt.getId() + ":" + line.getId();
        boolean batch = product.isRequiresBatchTracking();
        inventoryStockService.receive(
            principal,
            line.getProductId(),
            batch ? trimToNull(item.batchNumber()) : null,
            batch ? item.manufacturedOn() : null,
            batch ? item.expiresOn() : null,
            line.getUnitRatePaise(),
            item.acceptedQuantity(),
            stockKey,
            null);
        movementId =
            stockMovementRepository
                .findByTenantIdAndIdempotencyKey(receipt.getTenantId(), stockKey)
                .map(StockMovement::getId)
                .orElse(null);
      }
      line.setAcceptedQuantity(strip(item.acceptedQuantity()));
      line.setRejectedQuantity(strip(item.rejectedQuantity()));
      line.setBatchNumber(trimToNull(item.batchNumber()));
      line.setManufacturedOn(item.manufacturedOn());
      line.setExpiresOn(item.expiresOn());
      line.setStockMovementId(movementId);
    }
    receipt.setStatus(GoodsReceiptStatus.CHECKED);
    receipt.setCheckedAt(now);
    receipt.setCheckedByUserId(principal.userId());
    receipt.setVisualInspectionPassed(command.visualInspectionPassed());
    receipt.setPackagingIntact(checklist.packagingIntact());
    receipt.setLabelMatches(checklist.labelMatches());
    receipt.setBatchReadable(checklist.batchReadable());
    receipt.setNoDamage(checklist.noDamage());
    receipt.setQcIdempotencyKey(key);
    try {
      goodsReceiptRepository.saveAndFlush(receipt);
      goodsReceiptLineRepository.saveAllAndFlush(lines);
    } catch (DataIntegrityViolationException ex) {
      if (causedBy(ex, "uq_goods_receipt_tenant_branch_qc_idempotency")) {
        return goodsReceiptRepository
            .findByTenantIdAndBranchIdAndQcIdempotencyKey(ctx.tenantId(), ctx.branchId(), key)
            .filter(existing -> existing.getId().equals(receipt.getId()))
            .map(existing -> replayOrConflict(existing, command, key))
            .orElseThrow(() -> idempotencyConflict());
      }
      throw ex;
    }
    audit(principal, receipt.getId());
    purchaseReturnService.recordFromQualityCheck(principal, receipt, lines);
    return toView(receipt, lines);
  }

  private QualityCheckView replayOrConflict(
      GoodsReceipt existing, QualityCheckCommand command, String key) {
    if (!key.equals(existing.getQcIdempotencyKey())) {
      QualityCheckPolicy.assertPending(existing.getStatus());
    }
    List<GoodsReceiptLine> lines = linesOf(existing);
    if (!sameDecision(existing, lines, command)) {
      throw idempotencyConflict();
    }
    return toView(existing, lines);
  }

  private boolean sameDecision(
      GoodsReceipt receipt, List<GoodsReceiptLine> lines, QualityCheckCommand command) {
    if (command.visualInspectionPassed() == null || command.checklist() == null) {
      return false;
    }
    QualityCheckCommand.Checklist checklist = command.checklist();
    if (!Objects.equals(receipt.getVisualInspectionPassed(), command.visualInspectionPassed())
        || !Objects.equals(receipt.getPackagingIntact(), checklist.packagingIntact())
        || !Objects.equals(receipt.getLabelMatches(), checklist.labelMatches())
        || !Objects.equals(receipt.getBatchReadable(), checklist.batchReadable())
        || !Objects.equals(receipt.getNoDamage(), checklist.noDamage())) {
      return false;
    }
    if (command.lines() == null || command.lines().size() != lines.size()) {
      return false;
    }
    Map<UUID, QualityCheckCommand.Line> byId = new HashMap<>();
    for (QualityCheckCommand.Line item : command.lines()) {
      if (item == null || item.goodsReceiptLineId() == null) {
        return false;
      }
      byId.put(item.goodsReceiptLineId(), item);
    }
    for (GoodsReceiptLine line : lines) {
      QualityCheckCommand.Line item = byId.get(line.getId());
      if (item == null) {
        return false;
      }
      if (cmp(line.getAcceptedQuantity(), item.acceptedQuantity()) != 0
          || cmp(line.getRejectedQuantity(), item.rejectedQuantity()) != 0
          || !Objects.equals(trimToNull(line.getBatchNumber()), trimToNull(item.batchNumber()))
          || !Objects.equals(line.getManufacturedOn(), item.manufacturedOn())
          || !Objects.equals(line.getExpiresOn(), item.expiresOn())) {
        return false;
      }
    }
    return true;
  }

  private QualityCheckListResult.Summary toSummary(GoodsReceipt receipt, String supplierName) {
    return new QualityCheckListResult.Summary(
        receipt.getId(),
        receipt.getReceiptNumber(),
        receipt.getReceiptReference(),
        receipt.getStatus(),
        supplierName,
        receipt.getCreatedAt(),
        receipt.getCheckedAt());
  }

  private QualityCheckView toView(GoodsReceipt receipt, List<GoodsReceiptLine> lines) {
    Map<UUID, Boolean> batchByProduct = new HashMap<>();
    for (GoodsReceiptLine line : lines) {
      batchByProduct.computeIfAbsent(
          line.getProductId(),
          productId ->
              productRepository
                  .findByIdAndTenantId(productId, receipt.getTenantId())
                  .map(Product::isRequiresBatchTracking)
                  .orElse(false));
    }
    QualityCheckView.ChecklistView checklist =
        receipt.getStatus() == GoodsReceiptStatus.CHECKED
            ? new QualityCheckView.ChecklistView(
                receipt.getPackagingIntact(),
                receipt.getLabelMatches(),
                receipt.getBatchReadable(),
                receipt.getNoDamage())
            : null;
    var qcReturn =
        purchaseReturnService.findQcReturn(
            receipt.getTenantId(), receipt.getBranchId(), receipt.getId());
    return new QualityCheckView(
        receipt.getId(),
        receipt.getReceiptNumber(),
        receipt.getReceiptReference(),
        receipt.getStatus(),
        supplierName(receipt),
        receipt.getCreatedAt(),
        receipt.getCheckedAt(),
        receipt.getCheckedByUserId(),
        receipt.getVisualInspectionPassed(),
        checklist,
        qcReturn.map(PurchaseReturnView::id).orElse(null),
        qcReturn.map(PurchaseReturnView::debitNoteNumber).orElse(null),
        lines.stream()
            .map(
                line ->
                    new QualityCheckView.LineView(
                        line.getId(),
                        line.getPurchaseOrderLineId(),
                        line.getProductId(),
                        line.getProductName(),
                        line.getSku(),
                        strip(line.getQuantity()),
                        line.getUnitRatePaise(),
                        Boolean.TRUE.equals(batchByProduct.get(line.getProductId())),
                        stripNullable(line.getAcceptedQuantity()),
                        stripNullable(line.getRejectedQuantity()),
                        line.getBatchNumber(),
                        line.getManufacturedOn(),
                        line.getExpiresOn(),
                        line.getStockMovementId()))
            .toList());
  }

  private String supplierName(GoodsReceipt receipt) {
    return supplierRepository
        .findByIdAndTenantId(receipt.getSupplierId(), receipt.getTenantId())
        .map(Supplier::getLegalName)
        .orElse("");
  }

  private List<GoodsReceiptLine> linesOf(GoodsReceipt receipt) {
    return goodsReceiptLineRepository
        .findAllByGoodsReceiptIdAndTenantIdAndBranchIdOrderBySortOrderAsc(
            receipt.getId(), receipt.getTenantId(), receipt.getBranchId());
  }

  private Context requirePharmacist(AuthPrincipal principal) {
    AppUser user = requireUser(principal);
    QualityCheckPolicy.requirePharmacist(
        user.getRole(), accessQueryService.hasAssignedRoleCode(user, "pharmacist"));
    return requireBranch(principal);
  }

  private Context requireFloorAccess(AuthPrincipal principal) {
    AppUser user = requireUser(principal);
    Set<ModuleCode> modules = accessQueryService.effectiveModules(user);
    if (!modules.contains(ModuleCode.INVENTORY) && !modules.contains(ModuleCode.PROCUREMENT)) {
      throw forbidden();
    }
    return requireBranch(principal);
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
        .orElseThrow(QualityCheckService::forbidden);
  }

  private Context requireBranch(AuthPrincipal principal) {
    UUID branchId = principal.activeBranchId();
    if (branchId == null) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, NO_BRANCH_CODE, NO_BRANCH_MESSAGE);
    }
    return new Context(principal.tenantId(), branchId);
  }

  private String requireIdempotencyKey(String key) {
    if (key == null || key.isBlank() || key.length() > 128) {
      throw validationError();
    }
    return key.trim();
  }

  private void audit(AuthPrincipal principal, UUID receiptId) {
    auditService.record(
        new AuditRecordCommand(
            principal.userId(),
            principal.tenantId(),
            principal.activeBranchId(),
            "GOODS_RECEIPT_QC",
            AuditService.OUTCOME_SUCCESS,
            null,
            null,
            null,
            principal.sessionId(),
            "{\"goodsReceiptId\":\"" + receiptId + "\"}"));
  }

  private static int cmp(BigDecimal left, BigDecimal right) {
    if (left == null || right == null) {
      return left == right ? 0 : 1;
    }
    return left.compareTo(right);
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

  private static BigDecimal stripNullable(BigDecimal value) {
    if (value == null) {
      return null;
    }
    return strip(value);
  }

  private static boolean blank(String value) {
    return value == null || value.isBlank();
  }

  private static String trimToNull(String value) {
    if (value == null) {
      return null;
    }
    String trimmed = value.trim();
    return trimmed.isEmpty() ? null : trimmed;
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

  private static ApiException idempotencyConflict() {
    return new ApiException(
        HttpStatus.CONFLICT,
        QualityCheckPolicy.IDEMPOTENCY_CONFLICT,
        "This quality-check key was already used with a different decision.");
  }

  private static ApiException notFound() {
    return new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Goods receipt was not found");
  }

  private static ApiException forbidden() {
    return new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Forbidden");
  }

  private record Context(UUID tenantId, UUID branchId) {}
}
