package com.nammamedmate.server.application.compliance;

import com.nammamedmate.server.application.access.AccessQueryService;
import com.nammamedmate.server.application.audit.AuditRecordCommand;
import com.nammamedmate.server.application.audit.AuditService;
import com.nammamedmate.server.application.subscription.SubscriptionService;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.ComplianceLicense;
import com.nammamedmate.server.domain.ComplianceReportKey;
import com.nammamedmate.server.domain.ComplianceReportPolicy;
import com.nammamedmate.server.domain.ControlledStockRegister;
import com.nammamedmate.server.domain.Customer;
import com.nammamedmate.server.domain.GoodsReceipt;
import com.nammamedmate.server.domain.GoodsReceiptLine;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.ModuleCode;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.Product;
import com.nammamedmate.server.domain.PurchaseReturn;
import com.nammamedmate.server.domain.PurchaseReturnLine;
import com.nammamedmate.server.domain.ReportAccessPolicy;
import com.nammamedmate.server.domain.ReportCapability;
import com.nammamedmate.server.domain.SalesInvoice;
import com.nammamedmate.server.domain.SalesInvoiceLine;
import com.nammamedmate.server.domain.SalesInvoiceStatus;
import com.nammamedmate.server.domain.ScheduleClassification;
import com.nammamedmate.server.domain.StockAdjustment;
import com.nammamedmate.server.domain.StockAdjustmentReason;
import com.nammamedmate.server.domain.StockAdjustmentStatus;
import com.nammamedmate.server.domain.StockBalance;
import com.nammamedmate.server.domain.StockBatch;
import com.nammamedmate.server.domain.StockMovement;
import com.nammamedmate.server.domain.StockTake;
import com.nammamedmate.server.domain.StockTakeLine;
import com.nammamedmate.server.domain.StockTakeStatus;
import com.nammamedmate.server.domain.Supplier;
import com.nammamedmate.server.infrastructure.pdf.ComplianceRegisterPdfRenderer;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.ComplianceLicenseRepository;
import com.nammamedmate.server.persistence.ControlledStockRegisterRepository;
import com.nammamedmate.server.persistence.CustomerRepository;
import com.nammamedmate.server.persistence.GoodsReceiptLineRepository;
import com.nammamedmate.server.persistence.GoodsReceiptRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.ProductRepository;
import com.nammamedmate.server.persistence.PurchaseReturnLineRepository;
import com.nammamedmate.server.persistence.PurchaseReturnRepository;
import com.nammamedmate.server.persistence.SalesInvoiceLineRepository;
import com.nammamedmate.server.persistence.SalesInvoiceRepository;
import com.nammamedmate.server.persistence.StockAdjustmentRepository;
import com.nammamedmate.server.persistence.StockBalanceRepository;
import com.nammamedmate.server.persistence.StockBatchRepository;
import com.nammamedmate.server.persistence.StockMovementRepository;
import com.nammamedmate.server.persistence.StockTakeLineRepository;
import com.nammamedmate.server.persistence.StockTakeRepository;
import com.nammamedmate.server.persistence.SupplierRepository;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ComplianceReportService {

  private static final DateTimeFormatter IST_TS =
      DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm").withZone(ComplianceReportPolicy.IST);
  private static final Set<StockAdjustmentReason> LOSS_REASONS =
      Set.of(StockAdjustmentReason.THEFT_LOSS, StockAdjustmentReason.SAMPLE_FREE_GOODS);

  private final AppUserRepository appUserRepository;
  private final AccessQueryService accessQueryService;
  private final SalesInvoiceRepository salesInvoiceRepository;
  private final SalesInvoiceLineRepository salesInvoiceLineRepository;
  private final CustomerRepository customerRepository;
  private final GoodsReceiptRepository goodsReceiptRepository;
  private final GoodsReceiptLineRepository goodsReceiptLineRepository;
  private final SupplierRepository supplierRepository;
  private final ComplianceLicenseRepository complianceLicenseRepository;
  private final ControlledStockRegisterRepository controlledStockRegisterRepository;
  private final StockBalanceRepository stockBalanceRepository;
  private final StockBatchRepository stockBatchRepository;
  private final ProductRepository productRepository;
  private final StockAdjustmentRepository stockAdjustmentRepository;
  private final PurchaseReturnRepository purchaseReturnRepository;
  private final PurchaseReturnLineRepository purchaseReturnLineRepository;
  private final StockTakeRepository stockTakeRepository;
  private final StockTakeLineRepository stockTakeLineRepository;
  private final StockMovementRepository stockMovementRepository;
  private final LocationRepository locationRepository;
  private final AuditService auditService;
  private final SubscriptionService subscriptionService;
  private final ComplianceRegisterPdfRenderer pdfRenderer;
  private final Clock clock;

  public ComplianceReportService(
      AppUserRepository appUserRepository,
      AccessQueryService accessQueryService,
      SalesInvoiceRepository salesInvoiceRepository,
      SalesInvoiceLineRepository salesInvoiceLineRepository,
      CustomerRepository customerRepository,
      GoodsReceiptRepository goodsReceiptRepository,
      GoodsReceiptLineRepository goodsReceiptLineRepository,
      SupplierRepository supplierRepository,
      ComplianceLicenseRepository complianceLicenseRepository,
      ControlledStockRegisterRepository controlledStockRegisterRepository,
      StockBalanceRepository stockBalanceRepository,
      StockBatchRepository stockBatchRepository,
      ProductRepository productRepository,
      StockAdjustmentRepository stockAdjustmentRepository,
      PurchaseReturnRepository purchaseReturnRepository,
      PurchaseReturnLineRepository purchaseReturnLineRepository,
      StockTakeRepository stockTakeRepository,
      StockTakeLineRepository stockTakeLineRepository,
      StockMovementRepository stockMovementRepository,
      LocationRepository locationRepository,
      AuditService auditService,
      SubscriptionService subscriptionService,
      ComplianceRegisterPdfRenderer pdfRenderer,
      Clock clock) {
    this.appUserRepository = appUserRepository;
    this.accessQueryService = accessQueryService;
    this.salesInvoiceRepository = salesInvoiceRepository;
    this.salesInvoiceLineRepository = salesInvoiceLineRepository;
    this.customerRepository = customerRepository;
    this.goodsReceiptRepository = goodsReceiptRepository;
    this.goodsReceiptLineRepository = goodsReceiptLineRepository;
    this.supplierRepository = supplierRepository;
    this.complianceLicenseRepository = complianceLicenseRepository;
    this.controlledStockRegisterRepository = controlledStockRegisterRepository;
    this.stockBalanceRepository = stockBalanceRepository;
    this.stockBatchRepository = stockBatchRepository;
    this.productRepository = productRepository;
    this.stockAdjustmentRepository = stockAdjustmentRepository;
    this.purchaseReturnRepository = purchaseReturnRepository;
    this.purchaseReturnLineRepository = purchaseReturnLineRepository;
    this.stockTakeRepository = stockTakeRepository;
    this.stockTakeLineRepository = stockTakeLineRepository;
    this.locationRepository = locationRepository;
    this.stockMovementRepository = stockMovementRepository;
    this.auditService = auditService;
    this.subscriptionService = subscriptionService;
    this.pdfRenderer = pdfRenderer;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public ComplianceReportCatalogView catalog(AuthPrincipal principal, UUID branchId) {
    requireViewer(principal, branchId);
    PlanCode plan = subscriptionService.resolveReportPlan(principal.tenantId());
    List<ComplianceReportCatalogItem> items =
        ComplianceReportPolicy.catalog().stream()
            .map(
                key -> {
                  ReportCapability capability = ReportAccessPolicy.capability(key);
                  ReportAccessPolicy.CatalogEntitlement entitlement =
                      capability == null
                          ? ReportAccessPolicy.openEntitlement()
                          : ReportAccessPolicy.entitlement(plan, capability);
                  return new ComplianceReportCatalogItem(
                      key.name(),
                      key.title(),
                      List.copyOf(key.filters()),
                      entitlement.entitled(),
                      entitlement.minPlan(),
                      entitlement.upgradeHint());
                })
            .toList();
    return new ComplianceReportCatalogView(items);
  }

  @Transactional(readOnly = true)
  public ComplianceReportTableView table(
      AuthPrincipal principal,
      String key,
      UUID branchId,
      Instant from,
      Instant to,
      UUID productId,
      UUID supplierId,
      String batchNumber) {
    Context ctx = requireViewer(principal, branchId);
    ComplianceReportKey report = ComplianceReportPolicy.requireKey(key);
    ReportCapability capability = ReportAccessPolicy.capability(report);
    if (capability != null) {
      ReportAccessPolicy.assertEntitled(
          subscriptionService.resolveReportPlan(principal.tenantId()), capability);
    }
    Instant[] window = ComplianceReportPolicy.resolveWindow(from, to, Instant.now(clock));
    String batch = ComplianceReportPolicy.requireBatchNumber(report, batchNumber);
    return build(ctx, report, window[0], window[1], productId, supplierId, batch);
  }

  @Transactional
  public ComplianceReportExport export(
      AuthPrincipal principal,
      String key,
      String format,
      UUID branchId,
      Instant from,
      Instant to,
      UUID productId,
      UUID supplierId,
      String batchNumber) {
    String kind = ComplianceReportPolicy.requireFormat(format);
    ComplianceReportTableView table =
        table(principal, key, branchId, from, to, productId, supplierId, batchNumber);
    ComplianceReportPolicy.requireExportSize(table.items().size());
    String slug = table.key().toLowerCase(Locale.ROOT).replace('_', '-') + "-register";
    auditService.record(
        new AuditRecordCommand(
            principal.userId(),
            principal.tenantId(),
            principal.activeBranchId(),
            ComplianceReportPolicy.ACTION,
            AuditService.OUTCOME_SUCCESS,
            null,
            null,
            null,
            principal.sessionId(),
            "{\"key\":\"" + table.key() + "\",\"format\":\"" + kind + "\"}"));
    if ("pdf".equals(kind)) {
      return new ComplianceReportExport(
          slug + ".pdf",
          "application/pdf",
          pdfRenderer.render(table.title(), table.columns(), table.items()));
    }
    return new ComplianceReportExport(
        slug + ".csv",
        "text/csv",
        csv(table.columns(), table.items()).getBytes(StandardCharsets.UTF_8));
  }

  private ComplianceReportTableView build(
      Context ctx,
      ComplianceReportKey key,
      Instant from,
      Instant to,
      UUID productId,
      UUID supplierId,
      String batchNumber) {
    Instant generatedAt = Instant.now(clock);
    return switch (key) {
      case H1_SALES -> h1Sales(ctx, from, to, productId, generatedAt);
      case PURCHASE ->
          purchase(ctx, from, to, supplierId, generatedAt, ComplianceReportKey.PURCHASE);
      case PURCHASE_INVOICE ->
          purchase(ctx, from, to, supplierId, generatedAt, ComplianceReportKey.PURCHASE_INVOICE);
      case SUPPLIER_LICENSE -> supplierLicenses(ctx, generatedAt);
      case LICENSE_EXPIRY -> licenseExpiry(ctx, generatedAt);
      case CONTROLLED_STOCK -> controlledStock(ctx, from, to, productId, generatedAt);
      case BATCH_STOCK -> batchStock(ctx, productId, generatedAt, false, false);
      case EXPIRED -> batchStock(ctx, productId, generatedAt, true, false);
      case DAMAGED ->
          adjustments(
              ctx, from, to, productId, generatedAt, Set.of(StockAdjustmentReason.DAMAGE_BREAKAGE));
      case SUPPLIER_RETURN -> supplierReturns(ctx, from, to, supplierId, generatedAt);
      case STOCK_LOSS -> adjustments(ctx, from, to, productId, generatedAt, LOSS_REASONS);
      case STOCK_VERIFICATION -> stockVerification(ctx, from, to, productId, generatedAt);
      case NEAR_EXPIRY -> batchStock(ctx, productId, generatedAt, false, true);
      case TRACEABILITY -> traceability(ctx, from, to, batchNumber, generatedAt);
      case SUPPLIER_PURCHASE ->
          purchase(ctx, from, to, supplierId, generatedAt, ComplianceReportKey.SUPPLIER_PURCHASE);
      case PRODUCT_TRACE -> productTrace(ctx, from, to, productId, generatedAt);
    };
  }

  private ComplianceReportTableView h1Sales(
      Context ctx, Instant from, Instant to, UUID productId, Instant generatedAt) {
    List<String> columns =
        List.of(
            "dateIst",
            "invoiceNumber",
            "productName",
            "sku",
            "batchNumber",
            "quantity",
            "patientName",
            "prescriptionReference");
    List<SalesInvoice> invoices =
        salesInvoiceRepository
            .findByTenantIdAndBranchIdAndStatusOrderByCreatedAtDesc(
                ctx.tenantId(), ctx.branchId(), SalesInvoiceStatus.COMPLETED)
            .stream()
            .filter(invoice -> inWindow(invoice.getCompletedAt(), from, to))
            .toList();
    if (invoices.isEmpty()) {
      return table(ComplianceReportKey.H1_SALES, columns, List.of(), generatedAt);
    }
    Map<UUID, SalesInvoice> byId =
        invoices.stream().collect(Collectors.toMap(SalesInvoice::getId, Function.identity()));
    List<SalesInvoiceLine> lines =
        salesInvoiceLineRepository.findAllByTenantIdAndBranchIdAndSalesInvoiceIdIn(
            ctx.tenantId(), ctx.branchId(), byId.keySet());
    List<Map<String, String>> items = new ArrayList<>();
    for (SalesInvoiceLine line : lines) {
      if (line.getScheduleClassification() != ScheduleClassification.H1) {
        continue;
      }
      if (productId != null && !productId.equals(line.getProductId())) {
        continue;
      }
      SalesInvoice invoice = byId.get(line.getSalesInvoiceId());
      if (invoice == null) {
        continue;
      }
      String patient =
          invoice.getCustomerId() == null
              ? ""
              : customerRepository
                  .findByIdAndTenantId(invoice.getCustomerId(), ctx.tenantId())
                  .map(Customer::getName)
                  .orElse("");
      items.add(
          cells(
              columns,
              ist(invoice.getCompletedAt()),
              text(invoice.getInvoiceNumber()),
              text(line.getProductName()),
              text(line.getSku()),
              text(line.getBatchNumber()),
              qty(line.getQuantity()),
              patient,
              text(invoice.getPrescriptionReference())));
    }
    return table(ComplianceReportKey.H1_SALES, columns, items, generatedAt);
  }

  private ComplianceReportTableView purchase(
      Context ctx,
      Instant from,
      Instant to,
      UUID supplierId,
      Instant generatedAt,
      ComplianceReportKey reportKey) {
    List<String> columns =
        List.of(
            "dateIst",
            "receiptNumber",
            "receiptReference",
            "supplierName",
            "productName",
            "sku",
            "batchNumber",
            "quantity",
            "unitRatePaise");
    List<GoodsReceipt> receipts =
        goodsReceiptRepository
            .findAllByTenantIdAndBranchIdOrderByCreatedAtDesc(ctx.tenantId(), ctx.branchId())
            .stream()
            .filter(receipt -> inWindow(receipt.getCreatedAt(), from, to))
            .filter(receipt -> supplierId == null || supplierId.equals(receipt.getSupplierId()))
            .toList();
    if (receipts.isEmpty()) {
      return table(reportKey, columns, List.of(), generatedAt);
    }
    Map<UUID, GoodsReceipt> byId =
        receipts.stream().collect(Collectors.toMap(GoodsReceipt::getId, Function.identity()));
    Map<UUID, String> suppliers =
        supplierRepository.findAllByTenantIdOrderByLegalNameAsc(ctx.tenantId()).stream()
            .collect(Collectors.toMap(Supplier::getId, Supplier::getLegalName));
    List<GoodsReceiptLine> lines =
        goodsReceiptLineRepository
            .findAllByGoodsReceiptIdInAndTenantIdAndBranchIdOrderBySortOrderAsc(
                byId.keySet(), ctx.tenantId(), ctx.branchId());
    List<Map<String, String>> items = new ArrayList<>();
    for (GoodsReceiptLine line : lines) {
      GoodsReceipt receipt = byId.get(line.getGoodsReceiptId());
      if (receipt == null) {
        continue;
      }
      items.add(
          cells(
              columns,
              ist(receipt.getCreatedAt()),
              text(receipt.getReceiptNumber()),
              text(receipt.getReceiptReference()),
              text(suppliers.get(receipt.getSupplierId())),
              text(line.getProductName()),
              text(line.getSku()),
              text(line.getBatchNumber()),
              qty(
                  line.getAcceptedQuantity() == null
                      ? line.getQuantity()
                      : line.getAcceptedQuantity()),
              String.valueOf(line.getUnitRatePaise())));
    }
    return table(reportKey, columns, items, generatedAt);
  }

  private ComplianceReportTableView supplierLicenses(Context ctx, Instant generatedAt) {
    List<String> columns =
        List.of(
            "legalName",
            "drugLicenseNumber",
            "drugLicenseType",
            "drugLicenseExpiry",
            "fssaiLicenseNumber");
    List<Map<String, String>> items = new ArrayList<>();
    for (Supplier supplier :
        supplierRepository.findAllByTenantIdOrderByLegalNameAsc(ctx.tenantId())) {
      items.add(
          cells(
              columns,
              text(supplier.getLegalName()),
              text(supplier.getDrugLicenseNumber()),
              supplier.getDrugLicenseType() == null ? "" : supplier.getDrugLicenseType().name(),
              supplier.getDrugLicenseExpiry() == null
                  ? ""
                  : supplier.getDrugLicenseExpiry().toString(),
              text(supplier.getFssaiLicenseNumber())));
    }
    return table(ComplianceReportKey.SUPPLIER_LICENSE, columns, items, generatedAt);
  }

  private ComplianceReportTableView licenseExpiry(Context ctx, Instant generatedAt) {
    List<String> columns =
        List.of("docType", "scope", "licenseNumber", "issuedOn", "expiresOn", "branchId");
    List<Map<String, String>> items = new ArrayList<>();
    for (ComplianceLicense license :
        complianceLicenseRepository.findAllByTenantIdOrderByExpiresOnAsc(ctx.tenantId())) {
      items.add(
          cells(
              columns,
              license.getDocType().name(),
              license.getScope().name(),
              text(license.getLicenseNumber()),
              license.getIssuedOn().toString(),
              license.getExpiresOn().toString(),
              license.getBranchId() == null ? "" : license.getBranchId().toString()));
    }
    return table(ComplianceReportKey.LICENSE_EXPIRY, columns, items, generatedAt);
  }

  private ComplianceReportTableView controlledStock(
      Context ctx, Instant from, Instant to, UUID productId, Instant generatedAt) {
    List<String> columns =
        List.of(
            "dateIst",
            "movementType",
            "productName",
            "sku",
            "schedule",
            "batchNumber",
            "quantity",
            "balanceAfter");
    List<ControlledStockRegister> rows =
        controlledStockRegisterRepository.findFiltered(
            ctx.tenantId(), ctx.branchId(), productId, null, from, to);
    List<Map<String, String>> items = new ArrayList<>();
    for (ControlledStockRegister row : rows) {
      items.add(
          cells(
              columns,
              ist(row.getOccurredAt()),
              row.getMovementType() == null ? "" : row.getMovementType().name(),
              text(row.getProductName()),
              text(row.getSku()),
              row.getScheduleClassification() == null ? "" : row.getScheduleClassification().name(),
              text(row.getBatchNumber()),
              qty(row.getQuantity()),
              qty(row.getBalanceAfter())));
    }
    return table(ComplianceReportKey.CONTROLLED_STOCK, columns, items, generatedAt);
  }

  private ComplianceReportTableView batchStock(
      Context ctx, UUID productId, Instant generatedAt, boolean expiredOnly, boolean nearOnly) {
    ComplianceReportKey key =
        expiredOnly
            ? ComplianceReportKey.EXPIRED
            : nearOnly ? ComplianceReportKey.NEAR_EXPIRY : ComplianceReportKey.BATCH_STOCK;
    List<String> columns = List.of("productName", "sku", "batchNumber", "expiresOn", "quantity");
    LocalDate today = LocalDate.ofInstant(Instant.now(clock), ZoneOffset.UTC);
    int warnDays = expiryWarnDays(ctx);
    List<Map<String, String>> items = new ArrayList<>();
    for (StockBalance balance :
        stockBalanceRepository.findAllByTenantIdAndBranchIdOrderByProductIdAsc(
            ctx.tenantId(), ctx.branchId())) {
      if (productId != null && !productId.equals(balance.getProductId())) {
        continue;
      }
      if (balance.getBatchId() == null) {
        continue;
      }
      StockBatch batch =
          stockBatchRepository
              .findByIdAndTenantId(balance.getBatchId(), ctx.tenantId())
              .orElse(null);
      if (batch == null) {
        continue;
      }
      LocalDate expiresOn = batch.getExpiresOn();
      boolean expired = expiresOn != null && expiresOn.isBefore(today);
      boolean near = expiresOn != null && !expired && !expiresOn.isAfter(today.plusDays(warnDays));
      if (expiredOnly && !expired) {
        continue;
      }
      if (nearOnly && !near) {
        continue;
      }
      Product product =
          productRepository
              .findByIdAndTenantId(balance.getProductId(), ctx.tenantId())
              .orElse(null);
      items.add(
          cells(
              columns,
              product == null ? "" : text(product.getName()),
              product == null ? "" : text(product.getSku()),
              text(batch.getBatchNumber()),
              expiresOn == null ? "" : expiresOn.toString(),
              qty(balance.getQuantity())));
    }
    return table(key, columns, items, generatedAt);
  }

  private ComplianceReportTableView adjustments(
      Context ctx,
      Instant from,
      Instant to,
      UUID productId,
      Instant generatedAt,
      Set<StockAdjustmentReason> reasons) {
    ComplianceReportKey key =
        reasons.contains(StockAdjustmentReason.DAMAGE_BREAKAGE) && reasons.size() == 1
            ? ComplianceReportKey.DAMAGED
            : ComplianceReportKey.STOCK_LOSS;
    List<String> columns =
        List.of("dateIst", "reason", "productName", "quantity", "direction", "status");
    List<Map<String, String>> items = new ArrayList<>();
    List<StockAdjustment> rows =
        stockAdjustmentRepository.findByTenantIdAndBranchIdAndStatusInOrderByCreatedAtDesc(
            ctx.tenantId(),
            ctx.branchId(),
            List.of(
                StockAdjustmentStatus.PENDING,
                StockAdjustmentStatus.APPROVED,
                StockAdjustmentStatus.REJECTED));
    for (StockAdjustment row : rows) {
      if (!reasons.contains(row.getReason())) {
        continue;
      }
      if (!inWindow(row.getCreatedAt(), from, to)) {
        continue;
      }
      if (productId != null && !productId.equals(row.getProductId())) {
        continue;
      }
      Product product =
          productRepository.findByIdAndTenantId(row.getProductId(), ctx.tenantId()).orElse(null);
      items.add(
          cells(
              columns,
              ist(row.getCreatedAt()),
              row.getReason().name(),
              product == null ? "" : text(product.getName()),
              qty(row.getQuantity()),
              row.getDirection().name(),
              row.getStatus().name()));
    }
    return table(key, columns, items, generatedAt);
  }

  private ComplianceReportTableView supplierReturns(
      Context ctx, Instant from, Instant to, UUID supplierId, Instant generatedAt) {
    List<String> columns =
        List.of(
            "dateIst",
            "debitNoteNumber",
            "supplierName",
            "productName",
            "sku",
            "quantity",
            "amountPaise");
    List<PurchaseReturn> returns =
        purchaseReturnRepository
            .findAllByTenantIdAndBranchIdOrderByCreatedAtDesc(ctx.tenantId(), ctx.branchId())
            .stream()
            .filter(row -> inWindow(row.getCreatedAt(), from, to))
            .filter(row -> supplierId == null || supplierId.equals(row.getSupplierId()))
            .toList();
    if (returns.isEmpty()) {
      return table(ComplianceReportKey.SUPPLIER_RETURN, columns, List.of(), generatedAt);
    }
    Map<UUID, PurchaseReturn> byId =
        returns.stream().collect(Collectors.toMap(PurchaseReturn::getId, Function.identity()));
    Map<UUID, String> suppliers =
        supplierRepository.findAllByTenantIdOrderByLegalNameAsc(ctx.tenantId()).stream()
            .collect(Collectors.toMap(Supplier::getId, Supplier::getLegalName));
    List<PurchaseReturnLine> lines =
        purchaseReturnLineRepository
            .findAllByPurchaseReturnIdInAndTenantIdAndBranchIdOrderBySortOrderAsc(
                byId.keySet(), ctx.tenantId(), ctx.branchId());
    List<Map<String, String>> items = new ArrayList<>();
    for (PurchaseReturnLine line : lines) {
      PurchaseReturn header = byId.get(line.getPurchaseReturnId());
      if (header == null) {
        continue;
      }
      items.add(
          cells(
              columns,
              ist(header.getCreatedAt()),
              text(header.getDebitNoteNumber()),
              text(suppliers.get(header.getSupplierId())),
              text(line.getProductName()),
              text(line.getSku()),
              qty(line.getQuantity()),
              String.valueOf(line.getAmountPaise())));
    }
    return table(ComplianceReportKey.SUPPLIER_RETURN, columns, items, generatedAt);
  }

  private ComplianceReportTableView stockVerification(
      Context ctx, Instant from, Instant to, UUID productId, Instant generatedAt) {
    List<String> columns =
        List.of("dateIst", "status", "productName", "expectedQuantity", "countedQuantity");
    List<StockTake> takes =
        stockTakeRepository
            .findByTenantIdAndBranchIdAndStatusOrderByCreatedAtDesc(
                ctx.tenantId(), ctx.branchId(), StockTakeStatus.POSTED)
            .stream()
            .filter(take -> inWindow(take.getCreatedAt(), from, to))
            .toList();
    List<Map<String, String>> items = new ArrayList<>();
    for (StockTake take : takes) {
      for (StockTakeLine line :
          stockTakeLineRepository.findAllByTenantIdAndStockTakeIdOrderByCreatedAtAsc(
              ctx.tenantId(), take.getId())) {
        if (productId != null && !productId.equals(line.getProductId())) {
          continue;
        }
        Product product =
            productRepository.findByIdAndTenantId(line.getProductId(), ctx.tenantId()).orElse(null);
        items.add(
            cells(
                columns,
                ist(take.getCreatedAt()),
                take.getStatus().name(),
                product == null ? "" : text(product.getName()),
                qty(line.getExpectedQuantity()),
                qty(line.getCountedQuantity())));
      }
    }
    return table(ComplianceReportKey.STOCK_VERIFICATION, columns, items, generatedAt);
  }

  private ComplianceReportTableView traceability(
      Context ctx, Instant from, Instant to, String batchNumber, Instant generatedAt) {
    List<String> columns =
        List.of("dateIst", "type", "productName", "batchNumber", "quantity", "balanceAfter");
    List<StockBatch> batches =
        stockBatchRepository.findAllByTenantIdAndBatchNumber(ctx.tenantId(), batchNumber);
    List<Map<String, String>> items = new ArrayList<>();
    for (StockBatch batch : batches) {
      List<StockMovement> movements =
          stockMovementRepository.findFiltered(
              ctx.tenantId(), ctx.branchId(), batch.getProductId(), batch.getId());
      Product product =
          productRepository.findByIdAndTenantId(batch.getProductId(), ctx.tenantId()).orElse(null);
      for (StockMovement movement : movements) {
        if (!inWindow(movement.getOccurredAt(), from, to)) {
          continue;
        }
        items.add(
            cells(
                columns,
                ist(movement.getOccurredAt()),
                movement.getType().name(),
                product == null ? "" : text(product.getName()),
                text(batch.getBatchNumber()),
                qty(movement.getQuantity()),
                qty(movement.getBalanceAfter())));
      }
    }
    return table(ComplianceReportKey.TRACEABILITY, columns, items, generatedAt);
  }

  private ComplianceReportTableView productTrace(
      Context ctx, Instant from, Instant to, UUID productId, Instant generatedAt) {
    List<String> columns =
        List.of("dateIst", "kind", "productName", "sku", "batchNumber", "quantity", "reference");
    List<Map<String, String>> items = new ArrayList<>();
    List<GoodsReceipt> receipts =
        goodsReceiptRepository
            .findAllByTenantIdAndBranchIdOrderByCreatedAtDesc(ctx.tenantId(), ctx.branchId())
            .stream()
            .filter(receipt -> inWindow(receipt.getCreatedAt(), from, to))
            .toList();
    if (!receipts.isEmpty()) {
      Map<UUID, GoodsReceipt> byId =
          receipts.stream().collect(Collectors.toMap(GoodsReceipt::getId, Function.identity()));
      List<GoodsReceiptLine> lines =
          goodsReceiptLineRepository
              .findAllByGoodsReceiptIdInAndTenantIdAndBranchIdOrderBySortOrderAsc(
                  byId.keySet(), ctx.tenantId(), ctx.branchId());
      for (GoodsReceiptLine line : lines) {
        if (productId != null && !productId.equals(line.getProductId())) {
          continue;
        }
        GoodsReceipt receipt = byId.get(line.getGoodsReceiptId());
        items.add(
            cells(
                columns,
                ist(receipt.getCreatedAt()),
                "PURCHASE",
                text(line.getProductName()),
                text(line.getSku()),
                text(line.getBatchNumber()),
                qty(
                    line.getAcceptedQuantity() == null
                        ? line.getQuantity()
                        : line.getAcceptedQuantity()),
                text(receipt.getReceiptNumber())));
      }
    }
    List<SalesInvoice> invoices =
        salesInvoiceRepository
            .findByTenantIdAndBranchIdAndStatusOrderByCreatedAtDesc(
                ctx.tenantId(), ctx.branchId(), SalesInvoiceStatus.COMPLETED)
            .stream()
            .filter(invoice -> inWindow(invoice.getCompletedAt(), from, to))
            .toList();
    if (!invoices.isEmpty()) {
      Map<UUID, SalesInvoice> byId =
          invoices.stream().collect(Collectors.toMap(SalesInvoice::getId, Function.identity()));
      List<SalesInvoiceLine> lines =
          salesInvoiceLineRepository.findAllByTenantIdAndBranchIdAndSalesInvoiceIdIn(
              ctx.tenantId(), ctx.branchId(), byId.keySet());
      for (SalesInvoiceLine line : lines) {
        if (productId != null && !productId.equals(line.getProductId())) {
          continue;
        }
        SalesInvoice invoice = byId.get(line.getSalesInvoiceId());
        items.add(
            cells(
                columns,
                ist(invoice.getCompletedAt()),
                "SALE",
                text(line.getProductName()),
                text(line.getSku()),
                text(line.getBatchNumber()),
                qty(line.getQuantity()),
                text(invoice.getInvoiceNumber())));
      }
    }
    return table(ComplianceReportKey.PRODUCT_TRACE, columns, items, generatedAt);
  }

  private Context requireViewer(AuthPrincipal principal, UUID branchId) {
    if (principal == null || principal.tenantId() == null) {
      throw ComplianceReportPolicy.forbidden();
    }
    AppUser user =
        appUserRepository
            .findById(principal.userId())
            .orElseThrow(ComplianceReportPolicy::forbidden);
    if (user.getDeletedAt() != null || !principal.tenantId().equals(user.getTenantId())) {
      throw ComplianceReportPolicy.forbidden();
    }
    if (!accessQueryService.effectiveModules(user).contains(ModuleCode.COMPLIANCE)) {
      throw ComplianceReportPolicy.forbidden();
    }
    if (principal.activeBranchId() == null) {
      throw ComplianceReportPolicy.noActiveBranch();
    }
    if (branchId != null && !branchId.equals(principal.activeBranchId())) {
      throw ComplianceReportPolicy.notFound();
    }
    locationRepository
        .findByIdAndTenantIdAndDeletedAtIsNull(principal.activeBranchId(), principal.tenantId())
        .orElseThrow(ComplianceReportPolicy::notFound);
    return new Context(principal.tenantId(), principal.activeBranchId());
  }

  private int expiryWarnDays(Context ctx) {
    return locationRepository
        .findByIdAndTenantIdAndDeletedAtIsNull(ctx.branchId(), ctx.tenantId())
        .map(ComplianceReportService::readExpiryWarnDays)
        .orElse(30);
  }

  private static int readExpiryWarnDays(Location branch) {
    Object value =
        branch.getInventorySettings() == null
            ? null
            : branch.getInventorySettings().get("expiryWarnDays");
    if (value instanceof Number number) {
      return Math.max(number.intValue(), 0);
    }
    return 30;
  }

  private static ComplianceReportTableView table(
      ComplianceReportKey key,
      List<String> columns,
      List<Map<String, String>> items,
      Instant generatedAt) {
    return new ComplianceReportTableView(key.name(), key.title(), columns, items, generatedAt);
  }

  private static Map<String, String> cells(List<String> columns, String... values) {
    Map<String, String> cells = new LinkedHashMap<>();
    for (int i = 0; i < columns.size(); i++) {
      cells.put(columns.get(i), i < values.length && values[i] != null ? values[i] : "");
    }
    return cells;
  }

  private static boolean inWindow(Instant value, Instant from, Instant to) {
    if (value == null) {
      return false;
    }
    return !value.isBefore(from) && !value.isAfter(to);
  }

  private static String ist(Instant value) {
    return value == null ? "" : IST_TS.format(value);
  }

  private static String text(String value) {
    return value == null ? "" : value;
  }

  private static String qty(BigDecimal value) {
    return value == null ? "" : value.stripTrailingZeros().toPlainString();
  }

  private static String csv(List<String> columns, List<Map<String, String>> items) {
    StringBuilder out = new StringBuilder();
    out.append(String.join(",", columns)).append('\n');
    for (Map<String, String> item : items) {
      List<String> cells = new ArrayList<>();
      for (String column : columns) {
        cells.add(csvEscape(item.get(column)));
      }
      out.append(String.join(",", cells)).append('\n');
    }
    return out.toString();
  }

  private static String csvEscape(String value) {
    String raw = value == null ? "" : value;
    if (raw.indexOf(',') >= 0 || raw.indexOf('"') >= 0 || raw.indexOf('\n') >= 0) {
      return '"' + raw.replace("\"", "\"\"") + '"';
    }
    return raw;
  }

  private record Context(UUID tenantId, UUID branchId) {}
}
