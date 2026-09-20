package com.nammamedmate.server.application.hospital;

import com.nammamedmate.server.application.access.AccessQueryService;
import com.nammamedmate.server.application.audit.AuditRecordCommand;
import com.nammamedmate.server.application.audit.AuditService;
import com.nammamedmate.server.application.branch.BranchAssignmentService;
import com.nammamedmate.server.application.inventory.InventoryStockService;
import com.nammamedmate.server.application.subscription.SubscriptionService;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.BranchStatus;
import com.nammamedmate.server.domain.HospitalAdmission;
import com.nammamedmate.server.domain.HospitalAdmissionStatus;
import com.nammamedmate.server.domain.HospitalCreditAccount;
import com.nammamedmate.server.domain.HospitalIndent;
import com.nammamedmate.server.domain.HospitalIssue;
import com.nammamedmate.server.domain.HospitalIssueKind;
import com.nammamedmate.server.domain.HospitalIssueLine;
import com.nammamedmate.server.domain.HospitalIssueReason;
import com.nammamedmate.server.domain.HospitalLedgerEntry;
import com.nammamedmate.server.domain.HospitalLedgerKind;
import com.nammamedmate.server.domain.HospitalPolicy;
import com.nammamedmate.server.domain.HospitalProductPriceRule;
import com.nammamedmate.server.domain.HospitalWard;
import com.nammamedmate.server.domain.HospitalWardStock;
import com.nammamedmate.server.domain.HospitalWsInvoiceSequence;
import com.nammamedmate.server.domain.InvoicePolicy;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.ModuleCode;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.Product;
import com.nammamedmate.server.domain.StockBalance;
import com.nammamedmate.server.domain.StockBatch;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.infrastructure.pdf.HospitalWsInvoicePdfRenderer;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.HospitalAdmissionRepository;
import com.nammamedmate.server.persistence.HospitalCreditAccountRepository;
import com.nammamedmate.server.persistence.HospitalIndentRepository;
import com.nammamedmate.server.persistence.HospitalIssueLineRepository;
import com.nammamedmate.server.persistence.HospitalIssueRepository;
import com.nammamedmate.server.persistence.HospitalLedgerEntryRepository;
import com.nammamedmate.server.persistence.HospitalProductPriceRuleRepository;
import com.nammamedmate.server.persistence.HospitalWardRepository;
import com.nammamedmate.server.persistence.HospitalWardStockRepository;
import com.nammamedmate.server.persistence.HospitalWsInvoiceSequenceRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.ProductRepository;
import com.nammamedmate.server.persistence.StockBalanceRepository;
import com.nammamedmate.server.persistence.StockBatchRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class HospitalIssueService {

  private static final ZoneId IST = ZoneId.of("Asia/Kolkata");
  private static final String NO_BRANCH_CODE = "NO_ACTIVE_BRANCH";
  private static final String NO_BRANCH_MESSAGE = "Select an outlet before issuing to a ward.";

  private final AppUserRepository appUserRepository;
  private final TenantRepository tenantRepository;
  private final LocationRepository locationRepository;
  private final HospitalIssueRepository issueRepository;
  private final HospitalIssueLineRepository issueLineRepository;
  private final HospitalWsInvoiceSequenceRepository sequenceRepository;
  private final HospitalWardStockRepository wardStockRepository;
  private final HospitalLedgerEntryRepository ledgerRepository;
  private final HospitalCreditAccountRepository accountRepository;
  private final HospitalProductPriceRuleRepository priceRuleRepository;
  private final HospitalWardRepository wardRepository;
  private final HospitalIndentRepository indentRepository;
  private final HospitalAdmissionRepository admissionRepository;
  private final ProductRepository productRepository;
  private final StockBatchRepository stockBatchRepository;
  private final StockBalanceRepository stockBalanceRepository;
  private final HospitalIndentService hospitalIndentService;
  private final InventoryStockService inventoryStockService;
  private final AccessQueryService accessQueryService;
  private final SubscriptionService subscriptionService;
  private final BranchAssignmentService branchAssignmentService;
  private final AuditService auditService;
  private final HospitalWsInvoicePdfRenderer pdfRenderer;
  private final Clock clock;

  public HospitalIssueService(
      AppUserRepository appUserRepository,
      TenantRepository tenantRepository,
      LocationRepository locationRepository,
      HospitalIssueRepository issueRepository,
      HospitalIssueLineRepository issueLineRepository,
      HospitalWsInvoiceSequenceRepository sequenceRepository,
      HospitalWardStockRepository wardStockRepository,
      HospitalLedgerEntryRepository ledgerRepository,
      HospitalCreditAccountRepository accountRepository,
      HospitalProductPriceRuleRepository priceRuleRepository,
      HospitalWardRepository wardRepository,
      HospitalIndentRepository indentRepository,
      HospitalAdmissionRepository admissionRepository,
      ProductRepository productRepository,
      StockBatchRepository stockBatchRepository,
      StockBalanceRepository stockBalanceRepository,
      HospitalIndentService hospitalIndentService,
      InventoryStockService inventoryStockService,
      AccessQueryService accessQueryService,
      SubscriptionService subscriptionService,
      BranchAssignmentService branchAssignmentService,
      AuditService auditService,
      HospitalWsInvoicePdfRenderer pdfRenderer,
      Clock clock) {
    this.appUserRepository = appUserRepository;
    this.tenantRepository = tenantRepository;
    this.locationRepository = locationRepository;
    this.issueRepository = issueRepository;
    this.issueLineRepository = issueLineRepository;
    this.sequenceRepository = sequenceRepository;
    this.wardStockRepository = wardStockRepository;
    this.ledgerRepository = ledgerRepository;
    this.accountRepository = accountRepository;
    this.priceRuleRepository = priceRuleRepository;
    this.wardRepository = wardRepository;
    this.indentRepository = indentRepository;
    this.admissionRepository = admissionRepository;
    this.productRepository = productRepository;
    this.stockBatchRepository = stockBatchRepository;
    this.stockBalanceRepository = stockBalanceRepository;
    this.hospitalIndentService = hospitalIndentService;
    this.inventoryStockService = inventoryStockService;
    this.accessQueryService = accessQueryService;
    this.subscriptionService = subscriptionService;
    this.branchAssignmentService = branchAssignmentService;
    this.auditService = auditService;
    this.pdfRenderer = pdfRenderer;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public HospitalIssueListView list(
      AuthPrincipal principal, UUID wardId, HospitalIssueKind kind, String q) {
    BranchContext ctx = requireRead(principal);
    List<HospitalIssue> issues =
        issueRepository.findAllByTenantIdAndBranchIdOrderByIssuedAtDesc(
            ctx.tenantId(), ctx.branchId());
    String query = q == null ? "" : q.trim().toLowerCase(Locale.ROOT);
    List<HospitalIssueView> items = new ArrayList<>();
    for (HospitalIssue issue : issues) {
      if (wardId != null && !wardId.equals(issue.getWardId())) {
        continue;
      }
      if (kind == HospitalIssueKind.RETURNS) {
        continue;
      }
      if (kind == HospitalIssueKind.REFILLS
          && issue.getReason() != HospitalIssueReason.PATIENT_REFILL) {
        continue;
      }
      if (kind == HospitalIssueKind.ISSUES
          && issue.getReason() == HospitalIssueReason.PATIENT_REFILL) {
        continue;
      }
      HospitalIssueView view = toView(ctx, issue);
      if (!query.isEmpty() && !matches(view, query)) {
        continue;
      }
      items.add(view);
    }
    return new HospitalIssueListView(items);
  }

  @Transactional(readOnly = true)
  public HospitalIssueView getById(AuthPrincipal principal, UUID issueId) {
    BranchContext ctx = requireRead(principal);
    HospitalIssue issue = requireIssue(issueId, ctx);
    return toView(ctx, issue);
  }

  @Transactional(readOnly = true)
  public HospitalIssuePdfBytes pdf(AuthPrincipal principal, UUID issueId) {
    BranchContext ctx = requireRead(principal);
    HospitalIssue issue = requireIssue(issueId, ctx);
    byte[] content = pdfRenderer.render(toPdfDocument(ctx, issue));
    return new HospitalIssuePdfBytes(filename(issue.getInvoiceNumber()), content);
  }

  @Transactional
  public HospitalIssueView create(AuthPrincipal principal, HospitalIssueCommand command) {
    BranchContext ctx = requireWriter(principal);
    String key = requireIdempotencyKey(command == null ? null : command.idempotencyKey());
    return issueRepository
        .findByTenantIdAndIdempotencyKey(ctx.tenantId(), key)
        .map(existing -> toView(ctx, existing))
        .orElseGet(() -> persistIssue(principal, ctx, command, key));
  }

  private HospitalIssueView persistIssue(
      AuthPrincipal principal, BranchContext ctx, HospitalIssueCommand command, String key) {
    if (command == null || command.wardId() == null) {
      throw validationError();
    }
    HospitalIssueReason reason = HospitalPolicy.parseIssueReason(command.reason());
    String uhid = trimOrNull(command.uhid());
    HospitalPolicy.requireUhidForRefill(reason, uhid);
    if (command.lines() == null || command.lines().isEmpty()) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          HospitalPolicy.LINES_REQUIRED,
          HospitalPolicy.LINES_REQUIRED_MESSAGE);
    }
    HospitalWard ward =
        wardRepository
            .findByIdAndTenantIdAndBranchId(command.wardId(), ctx.tenantId(), ctx.branchId())
            .orElseThrow(HospitalPolicy::notFound);
    HospitalIndent indent = null;
    if (command.indentId() != null) {
      indent =
          indentRepository
              .findByIdAndTenantIdAndBranchId(command.indentId(), ctx.tenantId(), ctx.branchId())
              .orElseThrow(HospitalPolicy::notFound);
      HospitalPolicy.assertCanIssue(indent.getStatus());
      if (!indent.getWardId().equals(ward.getId())) {
        throw HospitalPolicy.notFound();
      }
    }
    String patientName = trimOrNull(command.patientName());
    if (reason == HospitalIssueReason.PATIENT_REFILL) {
      HospitalAdmission admission =
          admissionRepository
              .findByTenantIdAndBranchIdAndUhidIgnoreCase(ctx.tenantId(), ctx.branchId(), uhid)
              .orElseThrow(HospitalPolicy::notFound);
      if (admission.getStatus() != HospitalAdmissionStatus.ACTIVE) {
        throw new ApiException(
            HttpStatus.UNPROCESSABLE_ENTITY,
            HospitalPolicy.UHID_REQUIRED,
            HospitalPolicy.UHID_REQUIRED_MESSAGE);
      }
      if (patientName == null) {
        patientName = admission.getPatientName();
      }
    }
    HospitalCreditAccount account =
        accountRepository
            .lockByTenantId(ctx.tenantId())
            .orElseThrow(HospitalPolicy::accountRequired);
    Location branch = loadVisibleBranch(ctx.user(), ctx.branchId());
    Tenant tenant = tenantRepository.findById(ctx.tenantId()).orElseThrow(HospitalPolicy::notFound);
    List<PreparedLine> prepared = prepareLines(ctx, command.lines(), account);
    long billed = prepared.stream().mapToLong(PreparedLine::amountPaise).sum();
    long mrpValue = prepared.stream().mapToLong(PreparedLine::mrpValuePaise).sum();
    HospitalPolicy.assertCreditAvailable(
        account.getBalancePaise(), billed, account.getCreditLimitPaise());

    Instant now = clock.instant();
    UUID issueId = UUID.randomUUID();
    String fy = InvoicePolicy.financialYear(LocalDate.ofInstant(now, IST));
    String invoiceNumber = nextInvoiceNumber(ctx, branch, fy);
    HospitalIssue issue = new HospitalIssue();
    issue.setId(issueId);
    issue.setTenantId(ctx.tenantId());
    issue.setBranchId(ctx.branchId());
    issue.setInvoiceNumber(invoiceNumber);
    issue.setWardId(ward.getId());
    issue.setIndentId(indent == null ? null : indent.getId());
    issue.setReason(reason);
    issue.setUhid(uhid);
    issue.setPatientName(patientName);
    issue.setPharmacyName(tenant.getName());
    issue.setPharmacyAddress(formatAddress(branch));
    issue.setPharmacyGstin(branch.getGstin());
    issue.setPharmacyDrugLicense(branch.getDrugLicenseNumber());
    issue.setHospitalName(account.getInstitutionName());
    issue.setHospitalGstin(account.getGstin());
    issue.setCreditTerms(account.getCreditTerms());
    issue.setMrpValuePaise(mrpValue);
    issue.setBilledPaise(billed);
    issue.setIssuedAt(now);
    issue.setIdempotencyKey(key);
    issue.setVersion(0L);
    issue.setCreatedAt(now);
    issue.setUpdatedAt(now);
    try {
      issueRepository.saveAndFlush(issue);
    } catch (DataIntegrityViolationException ex) {
      throw new ApiException(
          HttpStatus.CONFLICT, "NUMBER_COLLISION", "WS invoice number already used.");
    }

    List<HospitalIssueLine> savedLines = new ArrayList<>();
    Map<UUID, BigDecimal> issuedByProduct = new HashMap<>();
    int sort = 0;
    for (PreparedLine preparedLine : prepared) {
      UUID lineId = UUID.randomUUID();
      HospitalIssueLine line = toLine(ctx, issueId, lineId, preparedLine, sort++, now);
      issueLineRepository.save(line);
      savedLines.add(line);
      issuedByProduct.merge(
          preparedLine.product().getId(), preparedLine.quantity(), BigDecimal::add);
      StockBalance balance =
          stockBalanceRepository
              .findByTenantIdAndBranchIdAndProductIdAndBatchId(
                  ctx.tenantId(),
                  ctx.branchId(),
                  preparedLine.product().getId(),
                  preparedLine.batchId())
              .orElseThrow(
                  () ->
                      new ApiException(
                          HttpStatus.UNPROCESSABLE_ENTITY,
                          "INSUFFICIENT_STOCK",
                          "Not enough stock for this issue."));
      inventoryStockService.issue(
          principal,
          preparedLine.product().getId(),
          preparedLine.batchId(),
          preparedLine.quantity(),
          "hospital-issue:" + issueId + ":" + lineId,
          balance.getVersion());
      bumpWardStock(
          ctx, ward.getId(), preparedLine.product().getId(), preparedLine.quantity(), now);
    }

    account.setBalancePaise(account.getBalancePaise() + billed);
    account.setVersion(account.getVersion() + 1);
    account.setUpdatedAt(now);
    accountRepository.save(account);
    HospitalLedgerEntry ledger = new HospitalLedgerEntry();
    ledger.setId(UUID.randomUUID());
    ledger.setTenantId(ctx.tenantId());
    ledger.setBranchId(ctx.branchId());
    ledger.setAccountId(account.getId());
    ledger.setKind(HospitalLedgerKind.ISSUE);
    ledger.setDebitPaise(billed);
    ledger.setCreditPaise(0L);
    ledger.setIssueId(issueId);
    ledger.setParticulars(invoiceNumber + " issued");
    ledger.setOccurredAt(now);
    ledger.setIdempotencyKey("hospital-issue:" + issueId);
    ledger.setCreatedAt(now);
    ledgerRepository.save(ledger);

    if (indent != null) {
      hospitalIndentService.markIssued(
          ctx.tenantId(), ctx.branchId(), indent.getId(), invoiceNumber, now, issuedByProduct);
    }

    pdfRenderer.render(toPdfDocument(issue, ward.getName(), indent, savedLines));
    audit(ctx, "HOSPITAL_ISSUE_CREATE", issueId);
    if (indent != null) {
      audit(ctx, "HOSPITAL_INDENT_ISSUE", indent.getId());
    }
    return toView(issue, ward.getName(), indent, savedLines);
  }

  private List<PreparedLine> prepareLines(
      BranchContext ctx, List<HospitalIssueCommand.Line> lines, HospitalCreditAccount account) {
    List<PreparedLine> prepared = new ArrayList<>();
    for (HospitalIssueCommand.Line line : lines) {
      if (line == null || line.productId() == null || line.quantity() == null) {
        throw validationError();
      }
      Product product =
          productRepository
              .findByIdAndTenantId(line.productId(), ctx.tenantId())
              .orElseThrow(HospitalPolicy::notFound);
      StockBatch batch =
          stockBatchRepository
              .findByIdAndTenantId(line.batchId(), ctx.tenantId())
              .filter(row -> row.getProductId().equals(product.getId()))
              .orElseThrow(HospitalPolicy::notFound);
      long mrp = product.getDefaultMrpPaise() == null ? 0L : product.getDefaultMrpPaise();
      HospitalProductPriceRule rule =
          priceRuleRepository
              .findByTenantIdAndProductId(ctx.tenantId(), product.getId())
              .orElse(null);
      long credit =
          HospitalPolicy.creditPricePaise(
              mrp,
              account.getUniformDiscountBps(),
              rule == null ? null : rule.getRuleType(),
              rule == null ? null : rule.getValue());
      int discountBps = HospitalPolicy.effectiveDiscountBps(mrp, credit);
      long amount = HospitalPolicy.lineAmountPaise(credit, line.quantity());
      long mrpValue = HospitalPolicy.lineAmountPaise(mrp, line.quantity());
      prepared.add(
          new PreparedLine(
              product,
              batch.getId(),
              batch,
              line.quantity(),
              mrp,
              credit,
              discountBps,
              amount,
              mrpValue));
    }
    return prepared;
  }

  private void bumpWardStock(
      BranchContext ctx, UUID wardId, UUID productId, BigDecimal quantity, Instant now) {
    HospitalWardStock stock =
        wardStockRepository
            .lockByTenantIdAndBranchIdAndWardIdAndProductId(
                ctx.tenantId(), ctx.branchId(), wardId, productId)
            .orElseGet(
                () -> {
                  HospitalWardStock created = new HospitalWardStock();
                  created.setId(UUID.randomUUID());
                  created.setTenantId(ctx.tenantId());
                  created.setBranchId(ctx.branchId());
                  created.setWardId(wardId);
                  created.setProductId(productId);
                  created.setQuantity(BigDecimal.ZERO);
                  created.setVersion(0L);
                  created.setCreatedAt(now);
                  created.setUpdatedAt(now);
                  return created;
                });
    stock.setQuantity(stock.getQuantity().add(quantity));
    stock.setVersion(stock.getVersion() + 1);
    stock.setUpdatedAt(now);
    wardStockRepository.save(stock);
  }

  private String nextInvoiceNumber(BranchContext ctx, Location branch, String fy) {
    HospitalWsInvoiceSequence sequence =
        sequenceRepository
            .lockByTenantIdAndBranchIdAndFinancialYear(ctx.tenantId(), ctx.branchId(), fy)
            .orElseGet(
                () -> {
                  HospitalWsInvoiceSequence created = new HospitalWsInvoiceSequence();
                  created.setId(UUID.randomUUID());
                  created.setTenantId(ctx.tenantId());
                  created.setBranchId(ctx.branchId());
                  created.setFinancialYear(fy);
                  created.setNextValue(1);
                  return sequenceRepository.saveAndFlush(created);
                });
    int value = sequence.getNextValue();
    sequence.setNextValue(value + 1);
    sequenceRepository.save(sequence);
    return HospitalPolicy.wsInvoiceNumber(fy, branch.getBranchCode(), value);
  }

  private HospitalIssueLine toLine(
      BranchContext ctx, UUID issueId, UUID lineId, PreparedLine prepared, int sort, Instant now) {
    HospitalIssueLine line = new HospitalIssueLine();
    line.setId(lineId);
    line.setTenantId(ctx.tenantId());
    line.setBranchId(ctx.branchId());
    line.setIssueId(issueId);
    line.setProductId(prepared.product().getId());
    line.setProductName(prepared.product().getName());
    line.setSku(prepared.product().getSku());
    line.setBatchId(prepared.batchId());
    line.setBatchNumber(prepared.batch().getBatchNumber());
    line.setExpiryOn(prepared.batch().getExpiresOn());
    line.setHsnCode(prepared.product().getHsnCode());
    line.setGstRate(prepared.product().getGstRate());
    line.setQuantity(prepared.quantity());
    line.setMrpPaise(prepared.mrpPaise());
    line.setCreditPricePaise(prepared.creditPricePaise());
    line.setDiscountBps(prepared.discountBps());
    line.setAmountPaise(prepared.amountPaise());
    line.setSortOrder(sort);
    line.setCreatedAt(now);
    return line;
  }

  private HospitalIssueView toView(BranchContext ctx, HospitalIssue issue) {
    HospitalWard ward =
        wardRepository
            .findByIdAndTenantIdAndBranchId(issue.getWardId(), ctx.tenantId(), ctx.branchId())
            .orElse(null);
    HospitalIndent indent = null;
    if (issue.getIndentId() != null) {
      indent =
          indentRepository
              .findByIdAndTenantIdAndBranchId(issue.getIndentId(), ctx.tenantId(), ctx.branchId())
              .orElse(null);
    }
    List<HospitalIssueLine> lines =
        issueLineRepository.findAllByIssueIdAndTenantIdAndBranchIdOrderBySortOrderAsc(
            issue.getId(), ctx.tenantId(), ctx.branchId());
    return toView(issue, ward == null ? null : ward.getName(), indent, lines);
  }

  private HospitalIssueView toView(
      HospitalIssue issue, String wardName, HospitalIndent indent, List<HospitalIssueLine> lines) {
    return new HospitalIssueView(
        issue.getId(),
        issue.getInvoiceNumber(),
        issue.getWardId(),
        wardName,
        issue.getIndentId(),
        indent == null ? null : indent.getIndentNumber(),
        issue.getReason(),
        issue.getUhid(),
        issue.getPatientName(),
        issue.getPharmacyGstin(),
        issue.getHospitalGstin(),
        issue.getCreditTerms(),
        issue.getMrpValuePaise(),
        issue.getBilledPaise(),
        issue.getIssuedAt(),
        issue.getVersion(),
        lines.stream()
            .map(
                line ->
                    new HospitalIssueView.LineView(
                        line.getId(),
                        line.getProductId(),
                        line.getProductName(),
                        line.getSku(),
                        line.getBatchId(),
                        line.getBatchNumber(),
                        line.getExpiryOn(),
                        line.getHsnCode(),
                        line.getGstRate(),
                        line.getQuantity(),
                        line.getMrpPaise(),
                        line.getCreditPricePaise(),
                        line.getDiscountBps(),
                        line.getAmountPaise()))
            .toList());
  }

  private HospitalWsInvoicePdfDocument toPdfDocument(BranchContext ctx, HospitalIssue issue) {
    HospitalWard ward =
        wardRepository
            .findByIdAndTenantIdAndBranchId(issue.getWardId(), ctx.tenantId(), ctx.branchId())
            .orElse(null);
    HospitalIndent indent = null;
    if (issue.getIndentId() != null) {
      indent =
          indentRepository
              .findByIdAndTenantIdAndBranchId(issue.getIndentId(), ctx.tenantId(), ctx.branchId())
              .orElse(null);
    }
    List<HospitalIssueLine> lines =
        issueLineRepository.findAllByIssueIdAndTenantIdAndBranchIdOrderBySortOrderAsc(
            issue.getId(), ctx.tenantId(), ctx.branchId());
    return toPdfDocument(issue, ward == null ? null : ward.getName(), indent, lines);
  }

  private HospitalWsInvoicePdfDocument toPdfDocument(
      HospitalIssue issue, String wardName, HospitalIndent indent, List<HospitalIssueLine> lines) {
    return new HospitalWsInvoicePdfDocument(
        issue.getInvoiceNumber(),
        issue.getIssuedAt(),
        issue.getPharmacyName(),
        issue.getPharmacyAddress(),
        issue.getPharmacyGstin(),
        issue.getPharmacyDrugLicense(),
        issue.getHospitalName(),
        issue.getHospitalGstin(),
        wardName,
        issue.getReason() == null ? null : issue.getReason().name(),
        indent == null ? null : indent.getIndentNumber(),
        issue.getUhid(),
        issue.getPatientName(),
        issue.getCreditTerms() == null ? null : issue.getCreditTerms().name(),
        issue.getMrpValuePaise(),
        issue.getBilledPaise(),
        lines.stream()
            .map(
                line ->
                    new HospitalWsInvoicePdfDocument.Line(
                        line.getProductName(),
                        line.getBatchNumber(),
                        line.getExpiryOn(),
                        line.getHsnCode(),
                        line.getGstRate(),
                        line.getQuantity(),
                        line.getMrpPaise(),
                        line.getCreditPricePaise(),
                        line.getDiscountBps(),
                        line.getAmountPaise()))
            .toList());
  }

  private boolean matches(HospitalIssueView view, String query) {
    if (contains(view.invoiceNumber(), query)
        || contains(view.wardName(), query)
        || contains(view.patientName(), query)
        || contains(view.uhid(), query)
        || contains(view.indentNumber(), query)) {
      return true;
    }
    return view.lines().stream().anyMatch(line -> contains(line.productName(), query));
  }

  private static boolean contains(String value, String query) {
    return value != null && value.toLowerCase(Locale.ROOT).contains(query);
  }

  private HospitalIssue requireIssue(UUID issueId, BranchContext ctx) {
    return issueRepository
        .findByIdAndTenantIdAndBranchId(issueId, ctx.tenantId(), ctx.branchId())
        .orElseThrow(HospitalPolicy::notFound);
  }

  private BranchContext requireRead(AuthPrincipal principal) {
    AppUser user = requireTenantUser(principal);
    UUID branchId = requireActiveBranch(principal);
    PlanCode plan = subscriptionService.resolvePlan(user.getTenantId());
    HospitalPolicy.assertEntitled(plan);
    HospitalPolicy.requireHospitalModule(
        accessQueryService.effectiveModules(user).contains(ModuleCode.HOSPITAL));
    loadVisibleBranch(user, branchId);
    return new BranchContext(user, user.getTenantId(), branchId);
  }

  private BranchContext requireWriter(AuthPrincipal principal) {
    AppUser user = requireTenantUser(principal);
    UUID branchId = requireActiveBranch(principal);
    PlanCode plan = subscriptionService.resolvePlan(user.getTenantId());
    HospitalPolicy.assertEntitled(plan);
    boolean hasHospital = accessQueryService.effectiveModules(user).contains(ModuleCode.HOSPITAL);
    boolean pharmacist =
        accessQueryService.hasAssignedRoleCode(user, HospitalPolicy.PHARMACIST_CODE);
    boolean inventory = accessQueryService.hasAssignedRoleCode(user, HospitalPolicy.INVENTORY_CODE);
    HospitalPolicy.requireIndentWriter(user.getRole(), pharmacist, inventory, hasHospital);
    loadVisibleBranch(user, branchId);
    return new BranchContext(user, user.getTenantId(), branchId);
  }

  private UUID requireActiveBranch(AuthPrincipal principal) {
    if (principal.activeBranchId() == null) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, NO_BRANCH_CODE, NO_BRANCH_MESSAGE);
    }
    return principal.activeBranchId();
  }

  private Location loadVisibleBranch(AppUser user, UUID branchId) {
    Location branch =
        locationRepository
            .findByIdAndTenantIdAndDeletedAtIsNull(branchId, user.getTenantId())
            .orElseThrow(HospitalPolicy::notFound);
    if (branch.getStatus() != BranchStatus.ACTIVE) {
      throw HospitalPolicy.notFound();
    }
    if (!branchAssignmentService.canAccessBranch(user, branchId)) {
      throw HospitalPolicy.notFound();
    }
    return branch;
  }

  private AppUser requireTenantUser(AuthPrincipal principal) {
    if (principal == null || principal.tenantId() == null) {
      throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "Unauthenticated");
    }
    return appUserRepository
        .findById(principal.userId())
        .filter(user -> user.getTenantId() != null)
        .orElseThrow(
            () -> new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "Unauthenticated"));
  }

  private void audit(BranchContext ctx, String action, UUID entityId) {
    auditService.record(
        new AuditRecordCommand(
            ctx.user().getId(),
            ctx.tenantId(),
            ctx.branchId(),
            action,
            AuditService.OUTCOME_SUCCESS,
            null,
            null,
            null,
            null,
            "{\"id\":\"" + entityId + "\"}"));
  }

  private static String requireIdempotencyKey(String key) {
    if (key == null || key.isBlank()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
    return key.trim();
  }

  private static String trimOrNull(String value) {
    if (value == null) {
      return null;
    }
    String trimmed = value.trim();
    return trimmed.isEmpty() ? null : trimmed;
  }

  private static String formatAddress(Location branch) {
    List<String> parts = new ArrayList<>();
    if (branch.getAddressLine() != null && !branch.getAddressLine().isBlank()) {
      parts.add(branch.getAddressLine());
    }
    if (branch.getCity() != null && !branch.getCity().isBlank()) {
      parts.add(branch.getCity());
    }
    if (branch.getState() != null && !branch.getState().isBlank()) {
      parts.add(branch.getState());
    }
    if (branch.getPincode() != null && !branch.getPincode().isBlank()) {
      parts.add(branch.getPincode());
    }
    return String.join(", ", parts);
  }

  private static String filename(String invoiceNumber) {
    return invoiceNumber.replace("/", "-") + ".pdf";
  }

  private static ApiException validationError() {
    return new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
  }

  private record BranchContext(AppUser user, UUID tenantId, UUID branchId) {}

  private record PreparedLine(
      Product product,
      UUID batchId,
      StockBatch batch,
      BigDecimal quantity,
      long mrpPaise,
      long creditPricePaise,
      int discountBps,
      long amountPaise,
      long mrpValuePaise) {}
}
