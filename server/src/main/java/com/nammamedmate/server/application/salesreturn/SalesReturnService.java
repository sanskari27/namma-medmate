package com.nammamedmate.server.application.salesreturn;

import com.nammamedmate.server.application.access.AccessQueryService;
import com.nammamedmate.server.application.audit.AuditRecordCommand;
import com.nammamedmate.server.application.audit.AuditService;
import com.nammamedmate.server.application.compliance.ControlledSaleRecorder;
import com.nammamedmate.server.application.customercredit.CustomerCreditService;
import com.nammamedmate.server.application.inventory.InventoryStockService;
import com.nammamedmate.server.application.loyalty.LoyaltyService;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.ModuleCode;
import com.nammamedmate.server.domain.Product;
import com.nammamedmate.server.domain.SalesInvoice;
import com.nammamedmate.server.domain.SalesInvoiceLine;
import com.nammamedmate.server.domain.SalesReturn;
import com.nammamedmate.server.domain.SalesReturnDecision;
import com.nammamedmate.server.domain.SalesReturnLine;
import com.nammamedmate.server.domain.SalesReturnPolicy;
import com.nammamedmate.server.domain.SalesReturnRefundMode;
import com.nammamedmate.server.domain.StockBatch;
import com.nammamedmate.server.domain.StockMovement;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.ProductRepository;
import com.nammamedmate.server.persistence.SalesInvoiceLineRepository;
import com.nammamedmate.server.persistence.SalesInvoiceRepository;
import com.nammamedmate.server.persistence.SalesReturnLineRepository;
import com.nammamedmate.server.persistence.SalesReturnRepository;
import com.nammamedmate.server.persistence.StockBatchRepository;
import com.nammamedmate.server.persistence.StockMovementRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
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
public class SalesReturnService {

  private static final String NO_BRANCH_CODE = "NO_ACTIVE_BRANCH";
  private static final String NO_BRANCH_MESSAGE = "Select an outlet before recording a return.";

  private final SalesReturnRepository salesReturnRepository;
  private final SalesReturnLineRepository salesReturnLineRepository;
  private final SalesInvoiceRepository salesInvoiceRepository;
  private final SalesInvoiceLineRepository salesInvoiceLineRepository;
  private final ProductRepository productRepository;
  private final StockBatchRepository stockBatchRepository;
  private final StockMovementRepository stockMovementRepository;
  private final AppUserRepository appUserRepository;
  private final AccessQueryService accessQueryService;
  private final InventoryStockService inventoryStockService;
  private final CustomerCreditService customerCreditService;
  private final LoyaltyService loyaltyService;
  private final AuditService auditService;
  private final ControlledSaleRecorder controlledSaleRecorder;
  private final Clock clock;

  public SalesReturnService(
      SalesReturnRepository salesReturnRepository,
      SalesReturnLineRepository salesReturnLineRepository,
      SalesInvoiceRepository salesInvoiceRepository,
      SalesInvoiceLineRepository salesInvoiceLineRepository,
      ProductRepository productRepository,
      StockBatchRepository stockBatchRepository,
      StockMovementRepository stockMovementRepository,
      AppUserRepository appUserRepository,
      AccessQueryService accessQueryService,
      InventoryStockService inventoryStockService,
      CustomerCreditService customerCreditService,
      LoyaltyService loyaltyService,
      AuditService auditService,
      ControlledSaleRecorder controlledSaleRecorder,
      Clock clock) {
    this.salesReturnRepository = salesReturnRepository;
    this.salesReturnLineRepository = salesReturnLineRepository;
    this.salesInvoiceRepository = salesInvoiceRepository;
    this.salesInvoiceLineRepository = salesInvoiceLineRepository;
    this.productRepository = productRepository;
    this.stockBatchRepository = stockBatchRepository;
    this.stockMovementRepository = stockMovementRepository;
    this.appUserRepository = appUserRepository;
    this.accessQueryService = accessQueryService;
    this.inventoryStockService = inventoryStockService;
    this.customerCreditService = customerCreditService;
    this.loyaltyService = loyaltyService;
    this.auditService = auditService;
    this.controlledSaleRecorder = controlledSaleRecorder;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public SalesReturnListResult list(AuthPrincipal principal) {
    Context ctx = requireFloorAccess(principal);
    List<SalesReturn> rows =
        salesReturnRepository.findAllByTenantIdAndBranchIdOrderByCreatedAtDesc(
            ctx.tenantId(), ctx.branchId());
    return new SalesReturnListResult(rows.stream().map(this::toSummary).toList());
  }

  @Transactional(readOnly = true)
  public SalesReturnView get(AuthPrincipal principal, UUID id) {
    Context ctx = requireFloorAccess(principal);
    SalesReturn row =
        salesReturnRepository
            .findByIdAndTenantIdAndBranchId(id, ctx.tenantId(), ctx.branchId())
            .orElseThrow(SalesReturnService::notFound);
    return toView(row, linesOf(row));
  }

  @Transactional(readOnly = true)
  public SalesReturnView preview(AuthPrincipal principal, SalesReturnCommand command) {
    Context ctx = requireFloorAccess(principal);
    Prepared prepared = prepare(ctx, command, false);
    return toPreviewView(prepared);
  }

  @Transactional
  public SalesReturnView create(AuthPrincipal principal, SalesReturnCommand command) {
    Context ctx = requireFloorAccess(principal);
    String key = SalesReturnPolicy.requireIdempotencyKey(command.idempotencyKey());
    SalesReturn existing =
        salesReturnRepository
            .findByTenantIdAndBranchIdAndIdempotencyKey(ctx.tenantId(), ctx.branchId(), key)
            .orElse(null);
    if (existing != null) {
      return replayOrConflict(existing, command);
    }

    Prepared prepared = prepare(ctx, command, true);
    Instant now = clock.instant();
    UUID returnId = UUID.randomUUID();
    SalesReturn row = new SalesReturn();
    row.setId(returnId);
    row.setTenantId(ctx.tenantId());
    row.setBranchId(ctx.branchId());
    row.setSalesInvoiceId(prepared.invoice().getId());
    row.setCustomerId(prepared.invoice().getCustomerId());
    row.setReason(prepared.reason());
    row.setDecision(prepared.decision());
    row.setRefundMode(prepared.refundMode());
    row.setRefundTotalPaise(prepared.refundTotalPaise());
    row.setCashRefundPaise(prepared.cashRefundPaise());
    row.setCreditNotePaise(prepared.creditNotePaise());
    row.setIdempotencyKey(key);
    row.setCreatedByUserId(principal.userId());
    row.setCreatedAt(now);
    try {
      salesReturnRepository.saveAndFlush(row);
    } catch (DataIntegrityViolationException ex) {
      if (causedBy(ex, "uq_sales_return_tenant_branch_idempotency")) {
        return salesReturnRepository
            .findByTenantIdAndBranchIdAndIdempotencyKey(ctx.tenantId(), ctx.branchId(), key)
            .map(found -> replayOrConflict(found, command))
            .orElseThrow(SalesReturnPolicy::idempotencyConflict);
      }
      throw ex;
    }

    List<SalesReturnLine> lines = new ArrayList<>();
    int sort = 0;
    for (PreparedLine item : prepared.lines()) {
      String stockKey = "sales-return:" + returnId + ":" + item.source().getId();
      inventoryStockService.restockFromSalesReturn(
          principal,
          item.source().getProductId(),
          item.source().getBatchId(),
          item.quantity(),
          stockKey);
      UUID movementId =
          stockMovementRepository
              .findByTenantIdAndIdempotencyKey(ctx.tenantId(), stockKey)
              .map(StockMovement::getId)
              .orElse(null);
      SalesReturnLine line = new SalesReturnLine();
      line.setId(UUID.randomUUID());
      line.setTenantId(ctx.tenantId());
      line.setBranchId(ctx.branchId());
      line.setSalesReturnId(returnId);
      line.setSalesInvoiceLineId(item.source().getId());
      line.setProductId(item.source().getProductId());
      line.setProductName(item.source().getProductName());
      line.setSku(item.source().getSku());
      line.setBatchId(item.source().getBatchId());
      line.setQuantity(item.quantity());
      line.setLineTotalPaise(item.source().getLineTotalPaise());
      line.setRefundAmountPaise(item.refundAmountPaise());
      line.setStockMovementId(movementId);
      line.setSortOrder(sort++);
      line.setCreatedAt(now);
      lines.add(line);
    }
    salesReturnLineRepository.saveAllAndFlush(lines);
    controlledSaleRecorder.recordReturn(prepared.invoice(), lines, now);

    if (prepared.refundMode() == SalesReturnRefundMode.CREDIT_NOTE) {
      customerCreditService.postCreditNote(
          principal,
          ctx.tenantId(),
          prepared.invoice().getCustomerId(),
          prepared.creditNotePaise(),
          prepared.invoice().getId(),
          "sales-return-credit:" + returnId);
    }

    loyaltyService.reverseForReturn(
        principal, prepared.invoice(), returnId, prepared.refundTotalPaise());

    audit(principal, returnId);
    return toView(row, lines);
  }

  private Prepared prepare(Context ctx, SalesReturnCommand command, boolean confirming) {
    if (command == null || command.salesInvoiceId() == null) {
      throw validationError();
    }
    if (confirming) {
      SalesReturnPolicy.requireIdempotencyKey(command.idempotencyKey());
    }
    String reason = SalesReturnPolicy.requireReason(command.reason());
    SalesReturnDecision decision = SalesReturnPolicy.requireDecision(command.decision());
    SalesReturnRefundMode refundMode = SalesReturnPolicy.requireRefundMode(command.refundMode());
    SalesReturnPolicy.assertLinesPresent(command.lines());

    SalesInvoice invoice =
        (confirming
                ? salesInvoiceRepository.lockByIdAndTenantIdAndBranchId(
                    command.salesInvoiceId(), ctx.tenantId(), ctx.branchId())
                : salesInvoiceRepository.findByIdAndTenantIdAndBranchId(
                    command.salesInvoiceId(), ctx.tenantId(), ctx.branchId()))
            .orElseThrow(SalesReturnService::invoiceNotFound);
    SalesReturnPolicy.assertInvoiceCompleted(invoice.getStatus());
    SalesReturnPolicy.assertCreditNoteCustomer(refundMode, invoice.getCustomerId());

    List<SalesInvoiceLine> invoiceLines =
        salesInvoiceLineRepository.findAllBySalesInvoiceIdAndTenantIdAndBranchIdOrderBySortOrderAsc(
            invoice.getId(), ctx.tenantId(), ctx.branchId());
    Map<UUID, SalesInvoiceLine> byId = new HashMap<>();
    for (SalesInvoiceLine line : invoiceLines) {
      byId.put(line.getId(), line);
    }

    List<PreparedLine> lines = new ArrayList<>();
    Set<UUID> seen = new LinkedHashSet<>();
    long refundTotal = 0L;
    LocalDate today = LocalDate.ofInstant(clock.instant(), ZoneOffset.UTC);
    for (SalesReturnCommand.Line item : command.lines()) {
      if (item == null
          || item.salesInvoiceLineId() == null
          || !seen.add(item.salesInvoiceLineId())) {
        throw validationError();
      }
      SalesInvoiceLine source = byId.get(item.salesInvoiceLineId());
      if (source == null) {
        throw validationError();
      }
      BigDecimal qty = SalesReturnPolicy.assertQuantity(item.quantity());
      SalesReturnPolicy.assertWithinNetSold(remainingNetSold(ctx, source), qty);
      Product product =
          productRepository
              .findByIdAndTenantId(source.getProductId(), ctx.tenantId())
              .orElseThrow(
                  () ->
                      new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Product was not found"));
      SalesReturnPolicy.assertProductReturnable(product.isReturnable());
      if (source.getBatchId() != null) {
        StockBatch batch =
            stockBatchRepository
                .findByIdAndTenantId(source.getBatchId(), ctx.tenantId())
                .orElseThrow(
                    () ->
                        new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Batch was not found"));
        SalesReturnPolicy.assertBatchNotExpired(batch.getExpiresOn(), today);
      }
      long refund =
          SalesReturnPolicy.refundAmountPaise(
              source.getLineTotalPaise(), qty, source.getQuantity());
      refundTotal += refund;
      lines.add(new PreparedLine(source, qty, refund));
    }
    long cash = refundMode == SalesReturnRefundMode.CASH ? refundTotal : 0L;
    long credit = refundMode == SalesReturnRefundMode.CREDIT_NOTE ? refundTotal : 0L;
    return new Prepared(invoice, reason, decision, refundMode, refundTotal, cash, credit, lines);
  }

  private SalesReturnView replayOrConflict(SalesReturn existing, SalesReturnCommand command) {
    if (command.salesInvoiceId() == null
        || !command.salesInvoiceId().equals(existing.getSalesInvoiceId())
        || !Objects.equals(existing.getReason(), SalesReturnPolicy.requireReason(command.reason()))
        || existing.getDecision() != SalesReturnPolicy.requireDecision(command.decision())
        || existing.getRefundMode() != SalesReturnPolicy.requireRefundMode(command.refundMode())) {
      throw SalesReturnPolicy.idempotencyConflict();
    }
    List<SalesReturnLine> lines = linesOf(existing);
    if (command.lines() == null || command.lines().size() != lines.size()) {
      throw SalesReturnPolicy.idempotencyConflict();
    }
    Map<UUID, BigDecimal> requested = new HashMap<>();
    for (SalesReturnCommand.Line item : command.lines()) {
      if (item == null || item.salesInvoiceLineId() == null) {
        throw SalesReturnPolicy.idempotencyConflict();
      }
      requested.put(item.salesInvoiceLineId(), item.quantity());
    }
    for (SalesReturnLine line : lines) {
      BigDecimal qty = requested.get(line.getSalesInvoiceLineId());
      if (qty == null || line.getQuantity().compareTo(qty) != 0) {
        throw SalesReturnPolicy.idempotencyConflict();
      }
    }
    return toView(existing, lines);
  }

  private BigDecimal remainingNetSold(Context ctx, SalesInvoiceLine source) {
    BigDecimal sold = strip(source.getQuantity());
    BigDecimal used = BigDecimal.ZERO;
    for (SalesReturnLine prior :
        salesReturnLineRepository.findAllByTenantIdAndBranchIdAndSalesInvoiceLineId(
            ctx.tenantId(), ctx.branchId(), source.getId())) {
      used = used.add(prior.getQuantity());
    }
    return sold.subtract(used);
  }

  private List<SalesReturnLine> linesOf(SalesReturn row) {
    return salesReturnLineRepository
        .findAllBySalesReturnIdAndTenantIdAndBranchIdOrderBySortOrderAsc(
            row.getId(), row.getTenantId(), row.getBranchId());
  }

  private SalesReturnListResult.Summary toSummary(SalesReturn row) {
    return new SalesReturnListResult.Summary(
        row.getId(),
        row.getSalesInvoiceId(),
        invoiceNumber(row),
        row.getCustomerId(),
        row.getReason(),
        row.getDecision(),
        row.getRefundMode(),
        row.getRefundTotalPaise(),
        row.getCreatedAt());
  }

  private SalesReturnView toView(SalesReturn row, List<SalesReturnLine> lines) {
    return new SalesReturnView(
        row.getId(),
        row.getSalesInvoiceId(),
        invoiceNumber(row),
        row.getCustomerId(),
        row.getReason(),
        row.getDecision(),
        row.getRefundMode(),
        row.getRefundTotalPaise(),
        row.getCashRefundPaise(),
        row.getCreditNotePaise(),
        row.getCreatedAt(),
        lines.stream().map(this::toLineView).toList());
  }

  private SalesReturnView toPreviewView(Prepared prepared) {
    return new SalesReturnView(
        null,
        prepared.invoice().getId(),
        prepared.invoice().getInvoiceNumber(),
        prepared.invoice().getCustomerId(),
        prepared.reason(),
        prepared.decision(),
        prepared.refundMode(),
        prepared.refundTotalPaise(),
        prepared.cashRefundPaise(),
        prepared.creditNotePaise(),
        null,
        prepared.lines().stream()
            .map(
                line ->
                    new SalesReturnView.LineView(
                        null,
                        line.source().getId(),
                        line.source().getProductId(),
                        line.source().getProductName(),
                        line.source().getSku(),
                        line.source().getBatchId(),
                        line.source().getBatchNumber(),
                        strip(line.quantity()),
                        line.source().getLineTotalPaise(),
                        line.refundAmountPaise(),
                        null))
            .toList());
  }

  private SalesReturnView.LineView toLineView(SalesReturnLine line) {
    return new SalesReturnView.LineView(
        line.getId(),
        line.getSalesInvoiceLineId(),
        line.getProductId(),
        line.getProductName(),
        line.getSku(),
        line.getBatchId(),
        batchNumber(line.getBatchId(), line.getTenantId()),
        strip(line.getQuantity()),
        line.getLineTotalPaise(),
        line.getRefundAmountPaise(),
        line.getStockMovementId());
  }

  private String invoiceNumber(SalesReturn row) {
    return salesInvoiceRepository
        .findByIdAndTenantIdAndBranchId(
            row.getSalesInvoiceId(), row.getTenantId(), row.getBranchId())
        .map(SalesInvoice::getInvoiceNumber)
        .orElse("");
  }

  private String batchNumber(UUID batchId, UUID tenantId) {
    if (batchId == null) {
      return null;
    }
    return stockBatchRepository
        .findByIdAndTenantId(batchId, tenantId)
        .map(StockBatch::getBatchNumber)
        .orElse(null);
  }

  private Context requireFloorAccess(AuthPrincipal principal) {
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
            .orElseThrow(SalesReturnService::forbidden);
    if (!accessQueryService.effectiveModules(user).contains(ModuleCode.SALES)) {
      throw forbidden();
    }
    UUID branchId = principal.activeBranchId();
    if (branchId == null) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, NO_BRANCH_CODE, NO_BRANCH_MESSAGE);
    }
    return new Context(principal.tenantId(), branchId);
  }

  private void audit(AuthPrincipal principal, UUID entityId) {
    auditService.record(
        new AuditRecordCommand(
            principal.userId(),
            principal.tenantId(),
            principal.activeBranchId(),
            "SALES_RETURN",
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
    return new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Sales return was not found");
  }

  private static ApiException invoiceNotFound() {
    return new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Invoice was not found");
  }

  private static ApiException forbidden() {
    return new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Forbidden");
  }

  private record Context(UUID tenantId, UUID branchId) {}

  private record Prepared(
      SalesInvoice invoice,
      String reason,
      SalesReturnDecision decision,
      SalesReturnRefundMode refundMode,
      long refundTotalPaise,
      long cashRefundPaise,
      long creditNotePaise,
      List<PreparedLine> lines) {}

  private record PreparedLine(
      SalesInvoiceLine source, BigDecimal quantity, long refundAmountPaise) {}
}
