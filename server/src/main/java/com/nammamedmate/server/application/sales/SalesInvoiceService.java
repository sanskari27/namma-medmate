package com.nammamedmate.server.application.sales;

import com.nammamedmate.server.application.access.AccessQueryService;
import com.nammamedmate.server.application.approval.ApprovalRequestView;
import com.nammamedmate.server.application.approval.ApprovalService;
import com.nammamedmate.server.application.approval.CreateApprovalRequestCommand;
import com.nammamedmate.server.application.audit.AuditRecordCommand;
import com.nammamedmate.server.application.audit.AuditService;
import com.nammamedmate.server.application.customercredit.CustomerCreditService;
import com.nammamedmate.server.application.product.ProductUnitConverter;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.ApprovalActionKey;
import com.nammamedmate.server.domain.ApprovalRequestStatus;
import com.nammamedmate.server.domain.ApprovalRule;
import com.nammamedmate.server.domain.BranchStatus;
import com.nammamedmate.server.domain.ControlledStockPolicy;
import com.nammamedmate.server.domain.DiscountApprovalStatus;
import com.nammamedmate.server.domain.DiscountType;
import com.nammamedmate.server.domain.GstRateSource;
import com.nammamedmate.server.domain.InvoicePaymentPolicy;
import com.nammamedmate.server.domain.InvoicePolicy;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.ModuleCode;
import com.nammamedmate.server.domain.Product;
import com.nammamedmate.server.domain.ProductUnit;
import com.nammamedmate.server.domain.ProductUnitConversion;
import com.nammamedmate.server.domain.SalesInvoice;
import com.nammamedmate.server.domain.SalesInvoiceLine;
import com.nammamedmate.server.domain.SalesInvoicePayment;
import com.nammamedmate.server.domain.SalesInvoiceSequence;
import com.nammamedmate.server.domain.SalesInvoiceStatus;
import com.nammamedmate.server.domain.StockBalance;
import com.nammamedmate.server.domain.StockBatch;
import com.nammamedmate.server.domain.TaxJurisdiction;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.ApprovalRequestRepository;
import com.nammamedmate.server.persistence.ApprovalRuleRepository;
import com.nammamedmate.server.persistence.CustomerRepository;
import com.nammamedmate.server.persistence.DoctorRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.ProductRepository;
import com.nammamedmate.server.persistence.ProductUnitConversionRepository;
import com.nammamedmate.server.persistence.SalesInvoiceLineRepository;
import com.nammamedmate.server.persistence.SalesInvoicePaymentRepository;
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
import java.util.HashMap;
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
  private final SalesInvoicePaymentRepository salesInvoicePaymentRepository;
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
  private final ApprovalService approvalService;
  private final ApprovalRuleRepository approvalRuleRepository;
  private final ApprovalRequestRepository approvalRequestRepository;
  private final AuditService auditService;
  private final CustomerCreditService customerCreditService;
  private final Clock clock;

  public SalesInvoiceService(
      SalesInvoiceRepository salesInvoiceRepository,
      SalesInvoiceLineRepository salesInvoiceLineRepository,
      SalesInvoicePaymentRepository salesInvoicePaymentRepository,
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
      ApprovalService approvalService,
      ApprovalRuleRepository approvalRuleRepository,
      ApprovalRequestRepository approvalRequestRepository,
      AuditService auditService,
      CustomerCreditService customerCreditService,
      Clock clock) {
    this.salesInvoiceRepository = salesInvoiceRepository;
    this.salesInvoiceLineRepository = salesInvoiceLineRepository;
    this.salesInvoicePaymentRepository = salesInvoicePaymentRepository;
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
    this.approvalService = approvalService;
    this.approvalRuleRepository = approvalRuleRepository;
    this.approvalRequestRepository = approvalRequestRepository;
    this.auditService = auditService;
    this.customerCreditService = customerCreditService;
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
    InvoicePaymentPolicy.assertDraft(invoice.getStatus());
    InvoicePolicy.assertVersion(invoice.getVersion(), command.expectedVersion());
    Instant now = clock.instant();
    applyParty(invoice, command, ctx.tenantId());
    List<SalesInvoiceLine> lines = replaceLines(invoice, command, now);
    evaluateDiscountApproval(
        principal,
        invoice,
        effectiveBps(
            invoice.getDiscountPaise(), invoice.getSubtotalPaise() + invoice.getDiscountPaise()));
    invoice.setVersion(invoice.getVersion() + 1);
    invoice.setUpdatedAt(now);
    salesInvoiceRepository.save(invoice);
    audit(principal, invoice.getId());
    return toView(invoice, lines);
  }

  @Transactional
  public SalesInvoiceView applyPricing(
      AuthPrincipal principal, UUID id, InvoicePricingCommand command) {
    Context ctx = requireReady(principal);
    if (command == null || command.expectedVersion() == null) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
    SalesInvoice invoice =
        salesInvoiceRepository
            .lockByIdAndTenantIdAndBranchId(id, ctx.tenantId(), ctx.branchId())
            .orElseThrow(SalesInvoiceService::notFound);
    InvoicePaymentPolicy.assertDraft(invoice.getStatus());
    InvoicePolicy.assertVersion(invoice.getVersion(), command.expectedVersion());
    Location branch = requireActiveBranch(ctx.tenantId(), ctx.branchId());
    TaxJurisdiction jurisdiction =
        InvoicePolicy.jurisdiction(branch.getGstin(), command.customerGstin());
    List<SalesInvoiceLine> existing = linesOf(invoice);
    InvoicePolicy.requireLines(existing);
    Map<UUID, InvoicePricingCommand.LineDiscount> requested = new HashMap<>();
    if (command.lines() != null) {
      for (InvoicePricingCommand.LineDiscount item : command.lines()) {
        if (item == null || item.productId() == null) {
          throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
        }
        requested.put(item.productId(), item);
      }
    }
    DiscountType billType =
        command.billDiscountType() == null ? DiscountType.NONE : command.billDiscountType();
    long billValue = command.billDiscountValue() == null ? 0L : command.billDiscountValue();
    List<InvoicePolicy.LinePriceInput> inputs = new ArrayList<>();
    for (SalesInvoiceLine line : existing) {
      InvoicePricingCommand.LineDiscount override = requested.get(line.getProductId());
      DiscountType type =
          override == null || override.type() == null ? line.getDiscountType() : override.type();
      long value =
          override == null
              ? line.getDiscountValue()
              : override.value() == null ? 0L : override.value();
      Product product = requireProduct(line.getProductId(), ctx.tenantId());
      inputs.add(
          new InvoicePolicy.LinePriceInput(
              line.getQuantity(), line.getSellingPricePaise(), type, value, product.getGstRate()));
    }
    InvoicePolicy.PricedBill bill =
        InvoicePolicy.priceBill(inputs, billType, billValue, jurisdiction);
    Instant now = clock.instant();
    invoice.setCustomerGstin(InvoicePolicy.optionalGstin(command.customerGstin()));
    invoice.setTaxJurisdiction(jurisdiction);
    invoice.setBillDiscountType(billType);
    invoice.setBillDiscountValue(billValue);
    invoice.setTaxAdjusted(false);
    invoice.setTaxAdjustmentReason(null);
    applyPricedBill(invoice, existing, bill, requested, now, ctx.tenantId());
    evaluateDiscountApproval(principal, invoice, bill.effectiveDiscountBps());
    invoice.setVersion(invoice.getVersion() + 1);
    invoice.setUpdatedAt(now);
    salesInvoiceRepository.save(invoice);
    auditPricing(principal, invoice.getId());
    return toView(invoice, existing);
  }

  @Transactional
  public SalesInvoiceView adjustTax(
      AuthPrincipal principal, UUID id, InvoiceTaxAdjustmentCommand command) {
    Context ctx = requireReady(principal);
    if (command == null || command.expectedVersion() == null) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
    String reason = InvoicePolicy.requireReason(command.reason());
    SalesInvoice invoice =
        salesInvoiceRepository
            .lockByIdAndTenantIdAndBranchId(id, ctx.tenantId(), ctx.branchId())
            .orElseThrow(SalesInvoiceService::notFound);
    InvoicePaymentPolicy.assertDraft(invoice.getStatus());
    InvoicePolicy.assertVersion(invoice.getVersion(), command.expectedVersion());
    if (command.lines() == null || command.lines().isEmpty()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
    Map<UUID, BigDecimal> rates = new HashMap<>();
    for (InvoiceTaxAdjustmentCommand.LineRate item : command.lines()) {
      if (item == null || item.productId() == null || item.gstRate() == null) {
        throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
      }
      rates.put(item.productId(), InvoicePolicy.requireGstRate(item.gstRate()));
    }
    List<SalesInvoiceLine> existing = linesOf(invoice);
    List<InvoicePolicy.LinePriceInput> inputs = new ArrayList<>();
    for (SalesInvoiceLine line : existing) {
      BigDecimal rate = rates.getOrDefault(line.getProductId(), line.getGstRate());
      inputs.add(
          new InvoicePolicy.LinePriceInput(
              line.getQuantity(),
              line.getSellingPricePaise(),
              line.getDiscountType() == null ? DiscountType.FLAT : line.getDiscountType(),
              line.getDiscountValue(),
              rate));
    }
    InvoicePolicy.PricedBill bill =
        InvoicePolicy.priceBill(
            inputs,
            invoice.getBillDiscountType() == null
                ? DiscountType.NONE
                : invoice.getBillDiscountType(),
            invoice.getBillDiscountValue(),
            invoice.getTaxJurisdiction() == null
                ? TaxJurisdiction.INTRA
                : invoice.getTaxJurisdiction());
    Instant now = clock.instant();
    applyPricedBill(invoice, existing, bill, Map.of(), now, ctx.tenantId());
    for (SalesInvoiceLine line : existing) {
      if (rates.containsKey(line.getProductId())) {
        if (line.getOriginalGstRate() == null) {
          line.setOriginalGstRate(line.getGstRate());
        }
        line.setGstRateSource(GstRateSource.MANUAL);
        line.setGstRate(rates.get(line.getProductId()));
        salesInvoiceLineRepository.save(line);
      }
    }
    invoice.setTaxAdjusted(true);
    invoice.setTaxAdjustmentReason(reason);
    invoice.setVersion(invoice.getVersion() + 1);
    invoice.setUpdatedAt(now);
    salesInvoiceRepository.save(invoice);
    auditService.record(
        new AuditRecordCommand(
            principal.userId(),
            principal.tenantId(),
            principal.activeBranchId(),
            "SALES_TAX_ADJUSTMENT",
            AuditService.OUTCOME_SUCCESS,
            null,
            null,
            null,
            principal.sessionId(),
            "{\"invoiceId\":\""
                + invoice.getId()
                + "\",\"reason\":\""
                + reason.replace("\\", "").replace("\"", "")
                + "\"}"));
    return toView(invoice, existing);
  }

  @Transactional(readOnly = true)
  public SalesInvoiceView assertReady(AuthPrincipal principal, UUID id) {
    Context ctx = requireReady(principal);
    SalesInvoice invoice = requireInvoice(id, ctx);
    InvoicePolicy.assertDiscountReady(invoice.getDiscountApprovalStatus());
    return toView(invoice, linesOf(invoice));
  }

  @Transactional
  public SalesInvoiceView complete(
      AuthPrincipal principal, UUID id, InvoiceCompletionCommand command) {
    Context ctx = requireReady(principal);
    if (command == null || command.expectedVersion() == null || command.payments() == null) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
    String key = requireIdempotencyKey(command.idempotencyKey());
    SalesInvoice invoice =
        salesInvoiceRepository
            .lockByIdAndTenantIdAndBranchId(id, ctx.tenantId(), ctx.branchId())
            .orElseThrow(SalesInvoiceService::notFound);
    if (invoice.getStatus() == SalesInvoiceStatus.COMPLETED) {
      if (key.equals(invoice.getCompleteIdempotencyKey())) {
        return toView(invoice, linesOf(invoice));
      }
      throw new ApiException(
          HttpStatus.CONFLICT,
          InvoicePaymentPolicy.DUPLICATE_COMPLETION,
          "This bill was already collected.");
    }
    InvoicePaymentPolicy.assertDraft(invoice.getStatus());
    InvoicePolicy.assertVersion(invoice.getVersion(), command.expectedVersion());
    InvoicePaymentPolicy.assertExpectedTotal(invoice.getTotalPaise(), command.expectedTotalPaise());
    InvoicePolicy.assertDiscountReady(invoice.getDiscountApprovalStatus());
    long changePaise = command.changePaise() == null ? 0L : command.changePaise();
    List<InvoicePaymentPolicy.Part> parts = new ArrayList<>();
    for (InvoiceCompletionCommand.Payment payment : command.payments()) {
      if (payment == null || payment.mode() == null || payment.amountPaise() == null) {
        throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
      }
      parts.add(
          new InvoicePaymentPolicy.Part(
              payment.mode(),
              payment.amountPaise(),
              InvoicePaymentPolicy.optionalReference(payment.reference())));
    }
    InvoicePaymentPolicy.Allocation allocation =
        InvoicePaymentPolicy.allocate(invoice.getTotalPaise(), changePaise, parts);
    InvoicePaymentPolicy.requireKhataCustomer(allocation.amountDuePaise(), invoice.getCustomerId());
    if (allocation.amountDuePaise() > 0L) {
      customerCreditService.chargeForSale(
          principal,
          ctx.tenantId(),
          invoice.getCustomerId(),
          allocation.amountDuePaise(),
          invoice.getId(),
          "sale:" + invoice.getId());
    }
    Instant now = clock.instant();
    int order = 0;
    for (InvoicePaymentPolicy.Part part : allocation.parts()) {
      SalesInvoicePayment row = new SalesInvoicePayment();
      row.setId(UUID.randomUUID());
      row.setTenantId(invoice.getTenantId());
      row.setBranchId(invoice.getBranchId());
      row.setSalesInvoiceId(invoice.getId());
      row.setMode(part.mode());
      row.setAmountPaise(part.amountPaise());
      row.setReference(part.reference());
      row.setSortOrder(order++);
      row.setCreatedAt(now);
      salesInvoicePaymentRepository.save(row);
    }
    invoice.setStatus(SalesInvoiceStatus.COMPLETED);
    invoice.setAmountPaidPaise(allocation.amountPaidPaise());
    invoice.setAmountDuePaise(allocation.amountDuePaise());
    invoice.setChangePaise(allocation.changePaise());
    invoice.setCompleteIdempotencyKey(key);
    invoice.setCompletedAt(now);
    invoice.setVersion(invoice.getVersion() + 1);
    invoice.setUpdatedAt(now);
    try {
      salesInvoiceRepository.saveAndFlush(invoice);
    } catch (DataIntegrityViolationException ex) {
      throw new ApiException(
          HttpStatus.CONFLICT,
          InvoicePaymentPolicy.DUPLICATE_COMPLETION,
          "This bill was already collected.");
    }
    auditService.record(
        new AuditRecordCommand(
            principal.userId(),
            principal.tenantId(),
            principal.activeBranchId(),
            "SALES_INVOICE_COMPLETE",
            AuditService.OUTCOME_SUCCESS,
            null,
            null,
            null,
            principal.sessionId(),
            "{\"invoiceId\":\"" + invoice.getId() + "\"}"));
    return toView(invoice, linesOf(invoice));
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
    List<PreparedLine> prepared =
        prepareLines(ctx, command, DiscountType.NONE, 0L, TaxJurisdiction.INTRA, Map.of());
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
    evaluateDiscountApproval(
        principal,
        invoice,
        effectiveBps(
            invoice.getDiscountPaise(), invoice.getSubtotalPaise() + invoice.getDiscountPaise()));
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
    Location branch = requireActiveBranch(ctx.tenantId(), ctx.branchId());
    TaxJurisdiction jurisdiction =
        InvoicePolicy.jurisdiction(branch.getGstin(), invoice.getCustomerGstin());
    DiscountType billType =
        invoice.getBillDiscountType() == null ? DiscountType.NONE : invoice.getBillDiscountType();
    Map<UUID, SalesInvoiceLine> previous = new HashMap<>();
    for (SalesInvoiceLine line : linesOf(invoice)) {
      previous.put(line.getProductId(), line);
    }
    List<PreparedLine> prepared =
        prepareLines(
            ctx, command, billType, invoice.getBillDiscountValue(), jurisdiction, previous);
    salesInvoiceLineRepository.deleteBySalesInvoiceIdAndTenantIdAndBranchId(
        invoice.getId(), invoice.getTenantId(), invoice.getBranchId());
    invoice.setTaxJurisdiction(jurisdiction);
    invoice.setTaxAdjusted(false);
    invoice.setTaxAdjustmentReason(null);
    applyHeaderMoney(invoice, prepared);
    return persistLines(invoice, prepared, now);
  }

  private List<PreparedLine> prepareLines(
      Context ctx,
      SalesInvoiceCommand command,
      DiscountType billType,
      long billValue,
      TaxJurisdiction jurisdiction,
      Map<UUID, SalesInvoiceLine> previous) {
    InvoicePolicy.requireLines(command.lines());
    Set<UUID> seen = new LinkedHashSet<>();
    List<DraftLine> drafts = new ArrayList<>();
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
      SalesInvoiceLine prior = previous.get(item.productId());
      DiscountType type = DiscountType.FLAT;
      long value = discount;
      if (prior != null && prior.getDiscountType() == DiscountType.PERCENT) {
        type = DiscountType.PERCENT;
        value = prior.getDiscountValue();
      }
      drafts.add(
          new DraftLine(
              product, batch, item.unit(), quantity, baseQuantity, mrp, selling, type, value));
    }
    InvoicePolicy.PricedBill priced =
        InvoicePolicy.priceBill(
            drafts.stream()
                .map(
                    row ->
                        new InvoicePolicy.LinePriceInput(
                            row.quantity(),
                            row.sellingPricePaise(),
                            row.discountType(),
                            row.discountValue(),
                            row.product().getGstRate()))
                .toList(),
            billType == null ? DiscountType.NONE : billType,
            billValue,
            jurisdiction);
    List<PreparedLine> prepared = new ArrayList<>();
    for (int i = 0; i < drafts.size(); i++) {
      DraftLine row = drafts.get(i);
      prepared.add(
          new PreparedLine(
              row.product(),
              row.batch(),
              row.unit(),
              row.quantity(),
              row.baseQuantity(),
              row.mrpPaise(),
              row.sellingPricePaise(),
              row.discountType(),
              row.discountValue(),
              priced.lines().get(i),
              i));
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
      line.setDiscountPaise(row.money().discountPaise());
      line.setDiscountType(row.discountType());
      line.setDiscountValue(row.discountValue());
      line.setBillDiscountPaise(row.money().billDiscountPaise());
      line.setHsnCode(row.product().getHsnCode());
      line.setTaxCategory(row.product().getTaxCategory());
      line.setGstRate(row.product().getGstRate());
      line.setGstRateSource(GstRateSource.PRODUCT);
      line.setOriginalGstRate(row.product().getGstRate());
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
    long taxable = 0L;
    long tax = 0L;
    long discount = 0L;
    long cgst = 0L;
    long sgst = 0L;
    long igst = 0L;
    for (PreparedLine row : prepared) {
      taxable += row.money().taxablePaise();
      tax += row.money().taxPaise();
      discount += row.money().discountPaise();
      cgst += row.money().cgstPaise();
      sgst += row.money().sgstPaise();
      igst += row.money().igstPaise();
    }
    invoice.setSubtotalPaise(taxable);
    invoice.setDiscountPaise(discount);
    invoice.setTaxPaise(tax);
    invoice.setTotalPaise(taxable + tax);
    invoice.setCgstPaise(cgst);
    invoice.setSgstPaise(sgst);
    invoice.setIgstPaise(igst);
    invoice.setRoundOffPaise(0L);
    if (invoice.getBillDiscountType() == null) {
      invoice.setBillDiscountType(DiscountType.NONE);
    }
    if (invoice.getTaxJurisdiction() == null) {
      invoice.setTaxJurisdiction(TaxJurisdiction.INTRA);
    }
    if (invoice.getDiscountApprovalStatus() == null) {
      invoice.setDiscountApprovalStatus(DiscountApprovalStatus.NOT_REQUIRED);
    }
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

  private List<SalesInvoicePayment> paymentsOf(SalesInvoice invoice) {
    return salesInvoicePaymentRepository
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
        invoice.getBillDiscountType(),
        invoice.getBillDiscountValue(),
        invoice.getCustomerGstin(),
        invoice.getTaxJurisdiction(),
        invoice.getCgstPaise(),
        invoice.getSgstPaise(),
        invoice.getIgstPaise(),
        invoice.getRoundOffPaise(),
        invoice.getDiscountApprovalRequestId(),
        invoice.getDiscountApprovalStatus() == null
            ? DiscountApprovalStatus.NOT_REQUIRED
            : invoice.getDiscountApprovalStatus(),
        invoice.getTaxAdjustmentReason(),
        invoice.isTaxAdjusted(),
        invoice.getAmountPaidPaise(),
        invoice.getAmountDuePaise(),
        invoice.getChangePaise(),
        invoice.getCompletedAt(),
        paymentsOf(invoice).stream()
            .map(
                payment ->
                    new SalesInvoiceView.PaymentView(
                        payment.getMode(), payment.getAmountPaise(), payment.getReference()))
            .toList(),
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
                        line.getDiscountType(),
                        line.getDiscountValue(),
                        line.getBillDiscountPaise(),
                        line.getHsnCode(),
                        line.getTaxCategory(),
                        line.getGstRate(),
                        line.getGstRateSource(),
                        line.getOriginalGstRate(),
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

  private void applyPricedBill(
      SalesInvoice invoice,
      List<SalesInvoiceLine> lines,
      InvoicePolicy.PricedBill bill,
      Map<UUID, InvoicePricingCommand.LineDiscount> requested,
      Instant now,
      UUID tenantId) {
    invoice.setSubtotalPaise(bill.subtotalPaise());
    invoice.setDiscountPaise(bill.discountPaise());
    invoice.setTaxPaise(bill.taxPaise());
    invoice.setTotalPaise(bill.totalPaise());
    invoice.setCgstPaise(bill.cgstPaise());
    invoice.setSgstPaise(bill.sgstPaise());
    invoice.setIgstPaise(bill.igstPaise());
    invoice.setRoundOffPaise(bill.roundOffPaise());
    for (int i = 0; i < lines.size(); i++) {
      SalesInvoiceLine line = lines.get(i);
      InvoicePolicy.PricedLine priced = bill.lines().get(i);
      InvoicePricingCommand.LineDiscount override = requested.get(line.getProductId());
      if (override != null) {
        line.setDiscountType(override.type() == null ? DiscountType.FLAT : override.type());
        line.setDiscountValue(override.value() == null ? 0L : override.value());
      }
      if (!requested.isEmpty()) {
        Product product = requireProduct(line.getProductId(), tenantId);
        line.setHsnCode(product.getHsnCode());
        line.setTaxCategory(product.getTaxCategory());
        line.setGstRate(product.getGstRate());
        line.setGstRateSource(GstRateSource.PRODUCT);
        line.setOriginalGstRate(product.getGstRate());
      }
      line.setDiscountPaise(priced.discountPaise());
      line.setBillDiscountPaise(priced.billDiscountPaise());
      line.setCgstPaise(priced.cgstPaise());
      line.setSgstPaise(priced.sgstPaise());
      line.setIgstPaise(priced.igstPaise());
      line.setLineTaxablePaise(priced.taxablePaise());
      line.setLineTaxPaise(priced.taxPaise());
      line.setLineTotalPaise(priced.totalPaise());
      salesInvoiceLineRepository.save(line);
    }
  }

  private void evaluateDiscountApproval(
      AuthPrincipal principal, SalesInvoice invoice, int effectiveBps) {
    cancelPendingDiscountRequest(invoice);
    ApprovalRule rule =
        approvalRuleRepository
            .findByTenantIdAndModuleCodeAndActionKeyAndDeletedAtIsNull(
                invoice.getTenantId(), ModuleCode.SALES, ApprovalActionKey.SALES_DISCOUNT_PERCENT)
            .orElse(null);
    if (rule == null
        || !InvoicePolicy.discountExceedsThreshold(effectiveBps, rule.getThresholdValue())) {
      invoice.setDiscountApprovalStatus(DiscountApprovalStatus.NOT_REQUIRED);
      invoice.setDiscountApprovalRequestId(null);
      return;
    }
    ApprovalRequestView request =
        approvalService.createRequest(
            principal,
            new CreateApprovalRequestCommand(
                ModuleCode.SALES,
                ApprovalActionKey.SALES_DISCOUNT_PERCENT,
                invoice.getBranchId(),
                effectiveBps,
                "{\"invoiceId\":\"" + invoice.getId() + "\"}",
                "inv-disc:" + invoice.getId() + ":" + (invoice.getVersion() + 1)));
    invoice.setDiscountApprovalRequestId(request.id());
    invoice.setDiscountApprovalStatus(DiscountApprovalStatus.PENDING);
  }

  private void cancelPendingDiscountRequest(SalesInvoice invoice) {
    UUID requestId = invoice.getDiscountApprovalRequestId();
    if (requestId == null) {
      return;
    }
    approvalRequestRepository
        .findById(requestId)
        .filter(row -> row.getStatus() == ApprovalRequestStatus.PENDING)
        .ifPresent(
            request -> {
              request.setStatus(ApprovalRequestStatus.CANCELLED);
              request.setUpdatedAt(clock.instant());
              request.setVersion(request.getVersion() + 1);
              approvalRequestRepository.save(request);
            });
  }

  private static int effectiveBps(long discountPaise, long grossPaise) {
    if (grossPaise <= 0L || discountPaise <= 0L) {
      return 0;
    }
    return java.math.BigDecimal.valueOf(discountPaise)
        .multiply(java.math.BigDecimal.valueOf(10000))
        .divide(java.math.BigDecimal.valueOf(grossPaise), 0, java.math.RoundingMode.HALF_UP)
        .intValueExact();
  }

  private void auditPricing(AuthPrincipal principal, UUID invoiceId) {
    auditService.record(
        new AuditRecordCommand(
            principal.userId(),
            principal.tenantId(),
            principal.activeBranchId(),
            "SALES_INVOICE_PRICING",
            AuditService.OUTCOME_SUCCESS,
            null,
            null,
            null,
            principal.sessionId(),
            "{\"invoiceId\":\"" + invoiceId + "\"}"));
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

  private record DraftLine(
      Product product,
      StockBatch batch,
      ProductUnit unit,
      BigDecimal quantity,
      BigDecimal baseQuantity,
      long mrpPaise,
      long sellingPricePaise,
      DiscountType discountType,
      long discountValue) {}

  private record PreparedLine(
      Product product,
      StockBatch batch,
      ProductUnit unit,
      BigDecimal quantity,
      BigDecimal baseQuantity,
      long mrpPaise,
      long sellingPricePaise,
      DiscountType discountType,
      long discountValue,
      InvoicePolicy.PricedLine money,
      int sortOrder) {}
}
