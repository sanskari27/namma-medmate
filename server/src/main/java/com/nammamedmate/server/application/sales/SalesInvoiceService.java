package com.nammamedmate.server.application.sales;

import com.nammamedmate.server.application.access.AccessQueryService;
import com.nammamedmate.server.application.audit.AuditRecordCommand;
import com.nammamedmate.server.application.audit.AuditService;
import com.nammamedmate.server.application.product.ProductUnitConverter;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.BranchStatus;
import com.nammamedmate.server.domain.ControlledStockPolicy;
import com.nammamedmate.server.domain.InvoicePolicy;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.ModuleCode;
import com.nammamedmate.server.domain.Product;
import com.nammamedmate.server.domain.ProductUnit;
import com.nammamedmate.server.domain.ProductUnitConversion;
import com.nammamedmate.server.domain.SalesInvoice;
import com.nammamedmate.server.domain.SalesInvoiceLine;
import com.nammamedmate.server.domain.SalesInvoiceSequence;
import com.nammamedmate.server.domain.SalesInvoiceStatus;
import com.nammamedmate.server.domain.StockBalance;
import com.nammamedmate.server.domain.StockBatch;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.CustomerRepository;
import com.nammamedmate.server.persistence.DoctorRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.ProductRepository;
import com.nammamedmate.server.persistence.ProductUnitConversionRepository;
import com.nammamedmate.server.persistence.SalesInvoiceLineRepository;
import com.nammamedmate.server.persistence.SalesInvoiceRepository;
import com.nammamedmate.server.persistence.SalesInvoiceSequenceRepository;
import com.nammamedmate.server.persistence.StockBalanceRepository;
import com.nammamedmate.server.persistence.StockBatchRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SalesInvoiceService {

  private static final ZoneId IST = ZoneId.of("Asia/Kolkata");
  private static final String NO_BRANCH_CODE = "NO_ACTIVE_BRANCH";
  private static final String NO_BRANCH_MESSAGE = "Select an outlet before saving a till bill.";

  private final SalesInvoiceRepository salesInvoiceRepository;
  private final SalesInvoiceLineRepository salesInvoiceLineRepository;
  private final SalesInvoiceSequenceRepository salesInvoiceSequenceRepository;
  private final ProductRepository productRepository;
  private final ProductUnitConversionRepository conversionRepository;
  private final StockBatchRepository stockBatchRepository;
  private final StockBalanceRepository stockBalanceRepository;
  private final CustomerRepository customerRepository;
  private final DoctorRepository doctorRepository;
  private final LocationRepository locationRepository;
  private final AppUserRepository appUserRepository;
  private final AccessQueryService accessQueryService;
  private final AuditService auditService;
  private final Clock clock;

  public SalesInvoiceService(
      SalesInvoiceRepository salesInvoiceRepository,
      SalesInvoiceLineRepository salesInvoiceLineRepository,
      SalesInvoiceSequenceRepository salesInvoiceSequenceRepository,
      ProductRepository productRepository,
      ProductUnitConversionRepository conversionRepository,
      StockBatchRepository stockBatchRepository,
      StockBalanceRepository stockBalanceRepository,
      CustomerRepository customerRepository,
      DoctorRepository doctorRepository,
      LocationRepository locationRepository,
      AppUserRepository appUserRepository,
      AccessQueryService accessQueryService,
      AuditService auditService,
      Clock clock) {
    this.salesInvoiceRepository = salesInvoiceRepository;
    this.salesInvoiceLineRepository = salesInvoiceLineRepository;
    this.salesInvoiceSequenceRepository = salesInvoiceSequenceRepository;
    this.productRepository = productRepository;
    this.conversionRepository = conversionRepository;
    this.stockBatchRepository = stockBatchRepository;
    this.stockBalanceRepository = stockBalanceRepository;
    this.customerRepository = customerRepository;
    this.doctorRepository = doctorRepository;
    this.locationRepository = locationRepository;
    this.appUserRepository = appUserRepository;
    this.accessQueryService = accessQueryService;
    this.auditService = auditService;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public SalesInvoiceListResult list(AuthPrincipal principal) {
    Context ctx = requireReady(principal);
    List<SalesInvoiceView> items =
        salesInvoiceRepository
            .findByTenantIdAndBranchIdOrderByCreatedAtDesc(ctx.tenantId(), ctx.branchId())
            .stream()
            .map(invoice -> toView(invoice, linesOf(invoice)))
            .toList();
    return new SalesInvoiceListResult(items);
  }

  @Transactional(readOnly = true)
  public SalesInvoiceView get(AuthPrincipal principal, UUID id) {
    Context ctx = requireReady(principal);
    SalesInvoice invoice = requireInvoice(id, ctx);
    return toView(invoice, linesOf(invoice));
  }

  @Transactional
  public SalesInvoiceView create(AuthPrincipal principal, SalesInvoiceCommand command) {
    Context ctx = requireReady(principal);
    String key = requireIdempotencyKey(command.idempotencyKey());
    return salesInvoiceRepository
        .findByTenantIdAndBranchIdAndIdempotencyKey(ctx.tenantId(), ctx.branchId(), key)
        .map(existing -> toView(existing, linesOf(existing)))
        .orElseGet(() -> insert(principal, ctx, command, key));
  }

  @Transactional
  public SalesInvoiceView update(AuthPrincipal principal, UUID id, SalesInvoiceCommand command) {
    Context ctx = requireReady(principal);
    SalesInvoice invoice =
        salesInvoiceRepository
            .lockByIdAndTenantIdAndBranchId(id, ctx.tenantId(), ctx.branchId())
            .orElseThrow(SalesInvoiceService::notFound);
    InvoicePolicy.assertVersion(invoice.getVersion(), command.expectedVersion());
    Instant now = clock.instant();
    applyParty(invoice, command, ctx.tenantId());
    List<SalesInvoiceLine> lines = replaceLines(invoice, command, now);
    invoice.setVersion(invoice.getVersion() + 1);
    invoice.setUpdatedAt(now);
    salesInvoiceRepository.save(invoice);
    audit(principal, invoice.getId());
    return toView(invoice, lines);
  }

  private SalesInvoiceView insert(
      AuthPrincipal principal, Context ctx, SalesInvoiceCommand command, String key) {
    InvoicePolicy.requireLines(command.lines());
    Location branch = requireActiveBranch(ctx.tenantId(), ctx.branchId());
    Instant now = clock.instant();
    SalesInvoice invoice = new SalesInvoice();
    invoice.setId(UUID.randomUUID());
    invoice.setTenantId(ctx.tenantId());
    invoice.setBranchId(ctx.branchId());
    invoice.setStatus(SalesInvoiceStatus.DRAFT);
    invoice.setStaffUserId(principal.userId());
    invoice.setTerminalId(principal.sessionId());
    invoice.setIdempotencyKey(key);
    invoice.setVersion(1);
    invoice.setCreatedAt(now);
    invoice.setUpdatedAt(now);
    applyParty(invoice, command, ctx.tenantId());
    List<PreparedLine> prepared = prepareLines(ctx, command);
    String fy = InvoicePolicy.financialYear(LocalDate.ofInstant(now, IST));
    invoice.setInvoiceNumber(nextInvoiceNumber(ctx, branch, fy));
    applyHeaderMoney(invoice, prepared);
    try {
      salesInvoiceRepository.saveAndFlush(invoice);
    } catch (DataIntegrityViolationException ex) {
      throw new ApiException(
          HttpStatus.CONFLICT,
          InvoicePolicy.NUMBER_COLLISION,
          "Invoice number already used at this outlet.");
    }
    List<SalesInvoiceLine> lines = persistLines(invoice, prepared, now);
    salesInvoiceRepository.save(invoice);
    audit(principal, invoice.getId());
    return toView(invoice, lines);
  }

  private void applyParty(SalesInvoice invoice, SalesInvoiceCommand command, UUID tenantId) {
    invoice.setCustomerId(requireCustomer(command.customerId(), tenantId));
    invoice.setDoctorId(requireDoctor(command.doctorId(), tenantId));
    String rx = command.prescriptionReference();
    invoice.setPrescriptionReference(rx == null || rx.isBlank() ? null : rx.trim());
    invoice.setPrescriptionVerified(command.prescriptionVerified());
  }

  private List<SalesInvoiceLine> replaceLines(
      SalesInvoice invoice, SalesInvoiceCommand command, Instant now) {
    Context ctx = new Context(invoice.getTenantId(), invoice.getBranchId());
    List<PreparedLine> prepared = prepareLines(ctx, command);
    salesInvoiceLineRepository.deleteBySalesInvoiceIdAndTenantIdAndBranchId(
        invoice.getId(), invoice.getTenantId(), invoice.getBranchId());
    applyHeaderMoney(invoice, prepared);
    return persistLines(invoice, prepared, now);
  }

  private List<PreparedLine> prepareLines(Context ctx, SalesInvoiceCommand command) {
    InvoicePolicy.requireLines(command.lines());
    Set<UUID> seen = new LinkedHashSet<>();
    List<PreparedLine> prepared = new ArrayList<>();
    int sort = 0;
    for (SalesInvoiceCommand.Line item : command.lines()) {
      if (item == null
          || item.productId() == null
          || item.unit() == null
          || !seen.add(item.productId())) {
        throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
      }
      Product product = requireProduct(item.productId(), ctx.tenantId());
      if (!product.isActive() || product.isDiscontinued()) {
        throw new ApiException(
            HttpStatus.UNPROCESSABLE_ENTITY,
            "PRODUCT_INACTIVE",
            "Inactive products cannot be billed.");
      }
      InvoicePolicy.requireControlledContext(
          ControlledStockPolicy.isControlled(product),
          command.customerId(),
          command.doctorId(),
          command.prescriptionVerified());
      long discount = item.discountPaise() == null ? 0L : item.discountPaise();
      long mrp = item.mrpPaise() == null ? 0L : item.mrpPaise();
      long selling = item.sellingPricePaise() == null ? 0L : item.sellingPricePaise();
      InvoicePolicy.requirePrices(mrp, selling, discount);
      BigDecimal quantity =
          InvoicePolicy.requireQuantity(item.quantity(), product.getQuantityPrecision());
      BigDecimal baseQuantity = toBase(product, item.unit(), quantity);
      StockBatch batch = requireBatch(product, item.batchId(), ctx, baseQuantity);
      InvoicePolicy.LineMoney money =
          InvoicePolicy.lineMoney(quantity, selling, discount, product.getGstRate());
      prepared.add(
          new PreparedLine(
              product,
              batch,
              item.unit(),
              quantity,
              baseQuantity,
              mrp,
              selling,
              discount,
              money,
              sort++));
    }
    return prepared;
  }

  private List<SalesInvoiceLine> persistLines(
      SalesInvoice invoice, List<PreparedLine> prepared, Instant now) {
    List<SalesInvoiceLine> saved = new ArrayList<>();
    for (PreparedLine row : prepared) {
      SalesInvoiceLine line = new SalesInvoiceLine();
      line.setId(UUID.randomUUID());
      line.setTenantId(invoice.getTenantId());
      line.setBranchId(invoice.getBranchId());
      line.setSalesInvoiceId(invoice.getId());
      line.setProductId(row.product().getId());
      line.setProductName(row.product().getName());
      line.setSku(row.product().getSku());
      line.setBatchId(row.batch() == null ? null : row.batch().getId());
      line.setBatchNumber(row.batch() == null ? null : row.batch().getBatchNumber());
      line.setExpiresOn(row.batch() == null ? null : row.batch().getExpiresOn());
      line.setQuantity(row.quantity());
      line.setUnit(row.unit());
      line.setBaseQuantity(row.baseQuantity());
      line.setMrpPaise(row.mrpPaise());
      line.setSellingPricePaise(row.sellingPricePaise());
      line.setDiscountPaise(row.discountPaise());
      line.setHsnCode(row.product().getHsnCode());
      line.setGstRate(row.product().getGstRate());
      line.setCgstPaise(row.money().cgstPaise());
      line.setSgstPaise(row.money().sgstPaise());
      line.setIgstPaise(row.money().igstPaise());
      line.setLineTaxablePaise(row.money().taxablePaise());
      line.setLineTaxPaise(row.money().taxPaise());
      line.setLineTotalPaise(row.money().totalPaise());
      line.setSortOrder(row.sortOrder());
      line.setCreatedAt(now);
      saved.add(salesInvoiceLineRepository.save(line));
    }
    return saved;
  }

  private void applyHeaderMoney(SalesInvoice invoice, List<PreparedLine> prepared) {
    InvoicePolicy.HeaderMoney header =
        InvoicePolicy.headerMoney(prepared.stream().map(PreparedLine::money).toList());
    invoice.setSubtotalPaise(header.subtotalPaise());
    invoice.setDiscountPaise(header.discountPaise());
    invoice.setTaxPaise(header.taxPaise());
    invoice.setTotalPaise(header.totalPaise());
  }

  private BigDecimal toBase(Product product, ProductUnit unit, BigDecimal quantity) {
    Map<ProductUnit, BigDecimal> factors =
        conversionRepository
            .findAllByTenantIdAndProductIdOrderByUnitAsc(product.getTenantId(), product.getId())
            .stream()
            .collect(
                Collectors.toMap(
                    ProductUnitConversion::getUnit,
                    ProductUnitConversion::getFactorToBase,
                    (a, b) -> a));
    try {
      return ProductUnitConverter.toBase(
          quantity, unit, product.getBaseUnit(), factors, product.getQuantityPrecision());
    } catch (ApiException ex) {
      if ("UNKNOWN_UNIT".equals(ex.getCode()) || "PRECISION_LOSS".equals(ex.getCode())) {
        throw new ApiException(
            HttpStatus.UNPROCESSABLE_ENTITY,
            InvoicePolicy.INVALID_UOM,
            "That sale unit is not set up for this medicine.");
      }
      throw ex;
    }
  }

  private StockBatch requireBatch(
      Product product, UUID batchId, Context ctx, BigDecimal baseQuantity) {
    if (product.isRequiresBatchTracking()) {
      if (batchId == null) {
        throw new ApiException(
            HttpStatus.UNPROCESSABLE_ENTITY,
            InvoicePolicy.FOREIGN_BATCH,
            "Pick a batch for this medicine.");
      }
      StockBatch batch =
          stockBatchRepository
              .findByIdAndTenantId(batchId, ctx.tenantId())
              .orElseThrow(SalesInvoiceService::notFound);
      InvoicePolicy.assertBatchOnProduct(batch.getProductId(), product.getId());
      StockBalance balance =
          stockBalanceRepository
              .findByTenantIdAndBranchIdAndProductIdAndBatchId(
                  ctx.tenantId(), ctx.branchId(), product.getId(), batchId)
              .orElseThrow(
                  () ->
                      new ApiException(
                          HttpStatus.UNPROCESSABLE_ENTITY,
                          InvoicePolicy.FOREIGN_BATCH,
                          "That batch is not on this outlet floor."));
      InvoicePolicy.assertStockAvailable(balance.getQuantity(), baseQuantity);
      return batch;
    }
    if (batchId != null) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          InvoicePolicy.FOREIGN_BATCH,
          "This medicine is not batch-tracked.");
    }
    StockBalance balance =
        stockBalanceRepository
            .findByTenantIdAndBranchIdAndProductIdAndBatchIdIsNull(
                ctx.tenantId(), ctx.branchId(), product.getId())
            .orElseThrow(
                () ->
                    new ApiException(
                        HttpStatus.CONFLICT,
                        InvoicePolicy.STALE_STOCK,
                        "Floor qty changed. Refresh the batch and try again."));
    InvoicePolicy.assertStockAvailable(balance.getQuantity(), baseQuantity);
    return null;
  }

  private String nextInvoiceNumber(Context ctx, Location branch, String fy) {
    SalesInvoiceSequence seq =
        salesInvoiceSequenceRepository
            .lockByTenantIdAndBranchIdAndFinancialYear(ctx.tenantId(), ctx.branchId(), fy)
            .orElseGet(() -> insertSequence(ctx, fy));
    int value = seq.getNextValue();
    seq.setNextValue(value + 1);
    salesInvoiceSequenceRepository.save(seq);
    return InvoicePolicy.invoiceNumber(fy, branch.getBranchCode(), value);
  }

  private SalesInvoiceSequence insertSequence(Context ctx, String fy) {
    SalesInvoiceSequence seq = new SalesInvoiceSequence();
    seq.setId(UUID.randomUUID());
    seq.setTenantId(ctx.tenantId());
    seq.setBranchId(ctx.branchId());
    seq.setFinancialYear(fy);
    seq.setNextValue(1);
    try {
      return salesInvoiceSequenceRepository.saveAndFlush(seq);
    } catch (DataIntegrityViolationException ex) {
      return salesInvoiceSequenceRepository
          .lockByTenantIdAndBranchIdAndFinancialYear(ctx.tenantId(), ctx.branchId(), fy)
          .orElseThrow(() -> ex);
    }
  }

  private List<SalesInvoiceLine> linesOf(SalesInvoice invoice) {
    return salesInvoiceLineRepository
        .findAllBySalesInvoiceIdAndTenantIdAndBranchIdOrderBySortOrderAsc(
            invoice.getId(), invoice.getTenantId(), invoice.getBranchId());
  }

  private SalesInvoiceView toView(SalesInvoice invoice, List<SalesInvoiceLine> lines) {
    return new SalesInvoiceView(
        invoice.getId(),
        invoice.getTenantId(),
        invoice.getBranchId(),
        invoice.getInvoiceNumber(),
        invoice.getStatus(),
        invoice.getStaffUserId(),
        invoice.getTerminalId(),
        invoice.getCustomerId(),
        invoice.getDoctorId(),
        invoice.getPrescriptionReference(),
        invoice.isPrescriptionVerified(),
        invoice.getVersion(),
        invoice.getSubtotalPaise(),
        invoice.getDiscountPaise(),
        invoice.getTaxPaise(),
        invoice.getTotalPaise(),
        lines.stream()
            .map(
                line ->
                    new SalesInvoiceView.LineView(
                        line.getId(),
                        line.getProductId(),
                        line.getProductName(),
                        line.getSku(),
                        line.getBatchId(),
                        line.getBatchNumber(),
                        line.getExpiresOn(),
                        line.getQuantity(),
                        line.getUnit(),
                        line.getBaseQuantity(),
                        line.getMrpPaise(),
                        line.getSellingPricePaise(),
                        line.getDiscountPaise(),
                        line.getHsnCode(),
                        line.getGstRate(),
                        line.getCgstPaise(),
                        line.getSgstPaise(),
                        line.getIgstPaise(),
                        line.getLineTaxablePaise(),
                        line.getLineTaxPaise(),
                        line.getLineTotalPaise()))
            .toList(),
        invoice.getCreatedAt(),
        invoice.getUpdatedAt());
  }

  private SalesInvoice requireInvoice(UUID id, Context ctx) {
    return salesInvoiceRepository
        .findByIdAndTenantIdAndBranchId(id, ctx.tenantId(), ctx.branchId())
        .orElseThrow(SalesInvoiceService::notFound);
  }

  private Product requireProduct(UUID id, UUID tenantId) {
    return productRepository
        .findByIdAndTenantId(id, tenantId)
        .orElseThrow(SalesInvoiceService::notFound);
  }

  private UUID requireCustomer(UUID id, UUID tenantId) {
    if (id == null) {
      return null;
    }
    return customerRepository
        .findByIdAndTenantIdAndDeletedAtIsNull(id, tenantId)
        .map(row -> row.getId())
        .orElseThrow(SalesInvoiceService::notFound);
  }

  private UUID requireDoctor(UUID id, UUID tenantId) {
    if (id == null) {
      return null;
    }
    return doctorRepository
        .findByIdAndTenantIdAndDeletedAtIsNull(id, tenantId)
        .map(row -> row.getId())
        .orElseThrow(SalesInvoiceService::notFound);
  }

  private Location requireActiveBranch(UUID tenantId, UUID branchId) {
    Location branch =
        locationRepository
            .findByIdAndTenantIdAndDeletedAtIsNull(branchId, tenantId)
            .orElseThrow(SalesInvoiceService::notFound);
    if (branch.getStatus() != BranchStatus.ACTIVE) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY, "BRANCH_INACTIVE", "Outlet is not active.");
    }
    return branch;
  }

  private Context requireReady(AuthPrincipal principal) {
    UUID tenantId = requireSalesAccess(principal);
    UUID branchId = principal.activeBranchId();
    if (branchId == null) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, NO_BRANCH_CODE, NO_BRANCH_MESSAGE);
    }
    return new Context(tenantId, branchId);
  }

  private UUID requireSalesAccess(AuthPrincipal principal) {
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
            .orElseThrow(SalesInvoiceService::forbidden);
    if (!accessQueryService.effectiveModules(user).contains(ModuleCode.SALES)) {
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

  private void audit(AuthPrincipal principal, UUID invoiceId) {
    auditService.record(
        new AuditRecordCommand(
            principal.userId(),
            principal.tenantId(),
            principal.activeBranchId(),
            "SALES_INVOICE_DRAFT",
            AuditService.OUTCOME_SUCCESS,
            null,
            null,
            null,
            principal.sessionId(),
            "{\"invoiceId\":\"" + invoiceId + "\"}"));
  }

  private static ApiException notFound() {
    return new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Invoice was not found");
  }

  private static ApiException forbidden() {
    return new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Forbidden");
  }

  private record Context(UUID tenantId, UUID branchId) {}

  private record PreparedLine(
      Product product,
      StockBatch batch,
      ProductUnit unit,
      BigDecimal quantity,
      BigDecimal baseQuantity,
      long mrpPaise,
      long sellingPricePaise,
      long discountPaise,
      InvoicePolicy.LineMoney money,
      int sortOrder) {}
}
