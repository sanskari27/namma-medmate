package com.nammamedmate.server.application.customreport;

import com.nammamedmate.server.application.access.AccessQueryService;
import com.nammamedmate.server.application.audit.AuditRecordCommand;
import com.nammamedmate.server.application.audit.AuditService;
import com.nammamedmate.server.application.subscription.SubscriptionService;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.CustomReportDataset;
import com.nammamedmate.server.domain.CustomReportFieldKind;
import com.nammamedmate.server.domain.CustomReportOperator;
import com.nammamedmate.server.domain.CustomReportPolicy;
import com.nammamedmate.server.domain.Customer;
import com.nammamedmate.server.domain.Expense;
import com.nammamedmate.server.domain.ExpensePostingStatus;
import com.nammamedmate.server.domain.GoodsReceipt;
import com.nammamedmate.server.domain.GoodsReceiptLine;
import com.nammamedmate.server.domain.GoodsReceiptStatus;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.ModuleCode;
import com.nammamedmate.server.domain.Product;
import com.nammamedmate.server.domain.PurchaseOrder;
import com.nammamedmate.server.domain.SalesInvoice;
import com.nammamedmate.server.domain.SalesInvoiceLine;
import com.nammamedmate.server.domain.SalesInvoiceStatus;
import com.nammamedmate.server.domain.StockBatch;
import com.nammamedmate.server.domain.StockMovement;
import com.nammamedmate.server.domain.Supplier;
import com.nammamedmate.server.infrastructure.pdf.FinanceReportPdfRenderer;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.CustomerRepository;
import com.nammamedmate.server.persistence.ExpenseRepository;
import com.nammamedmate.server.persistence.GoodsReceiptLineRepository;
import com.nammamedmate.server.persistence.GoodsReceiptRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.ProductRepository;
import com.nammamedmate.server.persistence.PurchaseOrderRepository;
import com.nammamedmate.server.persistence.SalesInvoiceLineRepository;
import com.nammamedmate.server.persistence.SalesInvoiceRepository;
import com.nammamedmate.server.persistence.StockBatchRepository;
import com.nammamedmate.server.persistence.StockMovementRepository;
import com.nammamedmate.server.persistence.SupplierRepository;
import com.nammamedmate.server.persistence.UserBranchRepository;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CustomReportService {

  private static final DateTimeFormatter IST_TS =
      DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm").withZone(CustomReportPolicy.IST);

  private final AppUserRepository appUserRepository;
  private final AccessQueryService accessQueryService;
  private final SubscriptionService subscriptionService;
  private final LocationRepository locationRepository;
  private final UserBranchRepository userBranchRepository;
  private final SalesInvoiceRepository salesInvoiceRepository;
  private final SalesInvoiceLineRepository salesInvoiceLineRepository;
  private final CustomerRepository customerRepository;
  private final StockMovementRepository stockMovementRepository;
  private final StockBatchRepository stockBatchRepository;
  private final ProductRepository productRepository;
  private final ExpenseRepository expenseRepository;
  private final GoodsReceiptRepository goodsReceiptRepository;
  private final GoodsReceiptLineRepository goodsReceiptLineRepository;
  private final PurchaseOrderRepository purchaseOrderRepository;
  private final SupplierRepository supplierRepository;
  private final FinanceReportPdfRenderer pdfRenderer;
  private final AuditService auditService;
  private final Clock clock;

  public CustomReportService(
      AppUserRepository appUserRepository,
      AccessQueryService accessQueryService,
      SubscriptionService subscriptionService,
      LocationRepository locationRepository,
      UserBranchRepository userBranchRepository,
      SalesInvoiceRepository salesInvoiceRepository,
      SalesInvoiceLineRepository salesInvoiceLineRepository,
      CustomerRepository customerRepository,
      StockMovementRepository stockMovementRepository,
      StockBatchRepository stockBatchRepository,
      ProductRepository productRepository,
      ExpenseRepository expenseRepository,
      GoodsReceiptRepository goodsReceiptRepository,
      GoodsReceiptLineRepository goodsReceiptLineRepository,
      PurchaseOrderRepository purchaseOrderRepository,
      SupplierRepository supplierRepository,
      FinanceReportPdfRenderer pdfRenderer,
      AuditService auditService,
      Clock clock) {
    this.appUserRepository = appUserRepository;
    this.accessQueryService = accessQueryService;
    this.subscriptionService = subscriptionService;
    this.locationRepository = locationRepository;
    this.userBranchRepository = userBranchRepository;
    this.salesInvoiceRepository = salesInvoiceRepository;
    this.salesInvoiceLineRepository = salesInvoiceLineRepository;
    this.customerRepository = customerRepository;
    this.stockMovementRepository = stockMovementRepository;
    this.stockBatchRepository = stockBatchRepository;
    this.productRepository = productRepository;
    this.expenseRepository = expenseRepository;
    this.goodsReceiptRepository = goodsReceiptRepository;
    this.goodsReceiptLineRepository = goodsReceiptLineRepository;
    this.purchaseOrderRepository = purchaseOrderRepository;
    this.supplierRepository = supplierRepository;
    this.pdfRenderer = pdfRenderer;
    this.auditService = auditService;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public CustomReportCatalogView catalog(AuthPrincipal principal) {
    Actor actor = authorize(principal);
    CustomReportPolicy.assertEntitled(subscriptionService.resolveReportPlan(actor.tenantId()));
    List<CustomReportCatalogView.DatasetItem> datasets = new ArrayList<>();
    for (CustomReportDataset dataset : CustomReportPolicy.datasets()) {
      List<CustomReportCatalogView.FieldItem> fields = new ArrayList<>();
      for (CustomReportPolicy.Field field : CustomReportPolicy.fields(dataset)) {
        fields.add(
            new CustomReportCatalogView.FieldItem(field.key(), field.label(), field.kind().name()));
      }
      datasets.add(
          new CustomReportCatalogView.DatasetItem(
              dataset.name(), datasetLabel(dataset), List.copyOf(fields)));
    }
    List<CustomReportCatalogView.OperatorItem> operators = new ArrayList<>();
    for (CustomReportOperator operator : CustomReportPolicy.operators()) {
      operators.add(
          new CustomReportCatalogView.OperatorItem(operator.name(), operatorLabel(operator)));
    }
    return new CustomReportCatalogView(List.copyOf(datasets), List.copyOf(operators));
  }

  @Transactional(readOnly = true)
  public CustomReportPreviewView preview(AuthPrincipal principal, CustomReportQuery query) {
    Table table = build(principal, query);
    int total = table.rows().size();
    int limit = CustomReportPolicy.previewLimit(total);
    return new CustomReportPreviewView(
        table.dataset().name(),
        table.from(),
        table.to(),
        table.scope(),
        table.branchId(),
        table.columns(),
        table.rows().subList(0, limit),
        limit,
        CustomReportPolicy.previewTruncated(total),
        Instant.now(clock));
  }

  @Transactional
  public CustomReportExport export(
      AuthPrincipal principal, CustomReportQuery query, String format) {
    String kind = CustomReportPolicy.requireFormat(format);
    Table table = build(principal, query);
    CustomReportPolicy.requireExportSize(table.rows().size());
    byte[] body;
    String filename;
    String contentType;
    if ("pdf".equals(kind)) {
      body = pdfRenderer.render(datasetLabel(table.dataset()), table.columns(), table.rows());
      filename = slug(table.dataset()) + ".pdf";
      contentType = "application/pdf";
    } else {
      body = csv(table.columns(), table.rows()).getBytes(StandardCharsets.UTF_8);
      filename = slug(table.dataset()) + ".csv";
      contentType = "text/csv";
    }
    auditService.record(
        new AuditRecordCommand(
            principal.userId(),
            principal.tenantId(),
            principal.activeBranchId(),
            CustomReportPolicy.ACTION,
            AuditService.OUTCOME_SUCCESS,
            null,
            null,
            null,
            principal.sessionId(),
            "{\"dataset\":\"" + table.dataset().name() + "\",\"format\":\"" + kind + "\"}"));
    return new CustomReportExport(filename, contentType, body);
  }

  private Table build(AuthPrincipal principal, CustomReportQuery query) {
    if (query == null) {
      throw CustomReportPolicy.shape();
    }
    Actor actor = authorize(principal);
    CustomReportPolicy.assertEntitled(subscriptionService.resolveReportPlan(actor.tenantId()));
    CustomReportDataset dataset = CustomReportPolicy.requireDataset(query.dataset());
    List<CustomReportPolicy.Field> columns =
        CustomReportPolicy.requireColumns(dataset, query.columns());
    List<AppliedFilter> filters = parseFilters(dataset, query.filters());
    CustomReportPolicy.Window window =
        CustomReportPolicy.resolveWindow(query.from(), query.to(), clock.instant());
    String scope = CustomReportPolicy.requireScope(actor.user().getRole(), query.scope());
    UUID requested = parseUuid(query.branchId());
    List<UUID> branchIds = resolveBranches(principal, actor.user(), requested, scope);
    UUID primary = CustomReportPolicy.SCOPE_TENANT.equals(scope) ? null : branchIds.get(0);
    List<Map<String, String>> rows =
        switch (dataset) {
          case SALES -> sales(actor.tenantId(), branchIds, window, columns, filters);
          case STOCK -> stock(actor.tenantId(), branchIds, window, columns, filters);
          case CUSTOMERS -> customers(actor.tenantId(), window, columns, filters);
          case PURCHASES -> purchases(actor.tenantId(), branchIds, window, columns, filters);
          case EXPENSES -> expenses(actor.tenantId(), branchIds, window, columns, filters);
        };
    return new Table(
        dataset,
        window.from(),
        window.to(),
        scope,
        primary,
        columns.stream().map(CustomReportPolicy.Field::key).toList(),
        rows);
  }

  private List<Map<String, String>> sales(
      UUID tenantId,
      List<UUID> branchIds,
      CustomReportPolicy.Window window,
      List<CustomReportPolicy.Field> columns,
      List<AppliedFilter> filters) {
    List<SalesInvoice> invoices =
        salesInvoiceRepository.findCompletedInWindow(
            tenantId,
            branchIds,
            SalesInvoiceStatus.COMPLETED,
            CustomReportPolicy.startInstant(window.from()),
            CustomReportPolicy.endExclusive(window.to()));
    Map<UUID, SalesInvoice> byId = new HashMap<>();
    for (SalesInvoice invoice : invoices) {
      byId.put(invoice.getId(), invoice);
    }
    List<SalesInvoiceLine> lines =
        invoices.isEmpty()
            ? List.of()
            : salesInvoiceLineRepository.findAllByTenantIdAndSalesInvoiceIdIn(
                tenantId, byId.keySet());
    Map<UUID, Customer> customers =
        customersById(
            tenantId,
            invoices.stream().map(SalesInvoice::getCustomerId).filter(id -> id != null).toList());
    Map<UUID, String> codes = branchCodes(tenantId);
    List<Map<String, String>> rows = new ArrayList<>();
    for (SalesInvoiceLine line : lines) {
      SalesInvoice invoice = byId.get(line.getSalesInvoiceId());
      if (invoice == null) {
        continue;
      }
      Customer customer =
          invoice.getCustomerId() == null ? null : customers.get(invoice.getCustomerId());
      Map<String, String> full = new LinkedHashMap<>();
      full.put("invoiceNumber", blank(invoice.getInvoiceNumber()));
      full.put(
          "billedIst",
          invoice.getCompletedAt() == null ? "" : IST_TS.format(invoice.getCompletedAt()));
      full.put("branchCode", codes.getOrDefault(line.getBranchId(), ""));
      full.put("sku", blank(line.getSku()));
      full.put("productName", blank(line.getProductName()));
      full.put("quantity", qty(line.getQuantity()));
      full.put("sellingPaise", Long.toString(line.getLineTotalPaise()));
      full.put("taxPaise", Long.toString(line.getLineTaxPaise()));
      full.put("customerName", customer == null ? "" : blank(customer.getName()));
      addIfMatch(rows, full, columns, filters);
    }
    return rows;
  }

  private List<Map<String, String>> stock(
      UUID tenantId,
      List<UUID> branchIds,
      CustomReportPolicy.Window window,
      List<CustomReportPolicy.Field> columns,
      List<AppliedFilter> filters) {
    List<StockMovement> movements =
        stockMovementRepository.findInWindow(
            tenantId,
            branchIds,
            CustomReportPolicy.startInstant(window.from()),
            CustomReportPolicy.endExclusive(window.to()));
    Map<UUID, Product> products =
        productsById(tenantId, movements.stream().map(StockMovement::getProductId).toList());
    Map<UUID, StockBatch> batches =
        batchesById(
            tenantId,
            movements.stream().map(StockMovement::getBatchId).filter(id -> id != null).toList());
    Map<UUID, String> codes = branchCodes(tenantId);
    List<Map<String, String>> rows = new ArrayList<>();
    for (StockMovement movement : movements) {
      Product product = products.get(movement.getProductId());
      StockBatch batch = movement.getBatchId() == null ? null : batches.get(movement.getBatchId());
      Map<String, String> full = new LinkedHashMap<>();
      full.put("occurredIst", IST_TS.format(movement.getOccurredAt()));
      full.put("movementType", movement.getType() == null ? "" : movement.getType().name());
      full.put("sku", product == null ? "" : blank(product.getSku()));
      full.put("productName", product == null ? "" : blank(product.getName()));
      full.put("quantity", qty(movement.getQuantity()));
      full.put("batchNumber", batch == null ? "" : blank(batch.getBatchNumber()));
      full.put("branchCode", codes.getOrDefault(movement.getBranchId(), ""));
      addIfMatch(rows, full, columns, filters);
    }
    return rows;
  }

  private List<Map<String, String>> customers(
      UUID tenantId,
      CustomReportPolicy.Window window,
      List<CustomReportPolicy.Field> columns,
      List<AppliedFilter> filters) {
    List<Map<String, String>> rows = new ArrayList<>();
    for (Customer customer :
        customerRepository.findCreatedInWindow(
            tenantId,
            CustomReportPolicy.startInstant(window.from()),
            CustomReportPolicy.endExclusive(window.to()))) {
      Map<String, String> full = new LinkedHashMap<>();
      full.put("name", blank(customer.getName()));
      full.put("phone", blank(customer.getPhone()));
      full.put("createdIst", IST_TS.format(customer.getCreatedAt()));
      addIfMatch(rows, full, columns, filters);
    }
    return rows;
  }

  private List<Map<String, String>> purchases(
      UUID tenantId,
      List<UUID> branchIds,
      CustomReportPolicy.Window window,
      List<CustomReportPolicy.Field> columns,
      List<AppliedFilter> filters) {
    List<GoodsReceipt> receipts =
        goodsReceiptRepository.findCheckedInWindow(
            tenantId,
            branchIds,
            GoodsReceiptStatus.CHECKED,
            CustomReportPolicy.startInstant(window.from()),
            CustomReportPolicy.endExclusive(window.to()));
    if (receipts.isEmpty()) {
      return List.of();
    }
    Map<UUID, GoodsReceipt> byId = new HashMap<>();
    List<UUID> receiptIds = new ArrayList<>();
    List<UUID> poIds = new ArrayList<>();
    List<UUID> supplierIds = new ArrayList<>();
    for (GoodsReceipt receipt : receipts) {
      byId.put(receipt.getId(), receipt);
      receiptIds.add(receipt.getId());
      poIds.add(receipt.getPurchaseOrderId());
      supplierIds.add(receipt.getSupplierId());
    }
    Map<UUID, PurchaseOrder> orders = new HashMap<>();
    for (PurchaseOrder order : purchaseOrderRepository.findAllByTenantIdAndIdIn(tenantId, poIds)) {
      orders.put(order.getId(), order);
    }
    Map<UUID, Supplier> suppliers = new HashMap<>();
    for (Supplier supplier : supplierRepository.findAllByTenantIdAndIdIn(tenantId, supplierIds)) {
      suppliers.put(supplier.getId(), supplier);
    }
    Map<UUID, String> codes = branchCodes(tenantId);
    List<Map<String, String>> rows = new ArrayList<>();
    for (GoodsReceiptLine line :
        goodsReceiptLineRepository.findAllByTenantIdAndGoodsReceiptIdIn(tenantId, receiptIds)) {
      GoodsReceipt receipt = byId.get(line.getGoodsReceiptId());
      if (receipt == null) {
        continue;
      }
      PurchaseOrder order = orders.get(receipt.getPurchaseOrderId());
      Supplier supplier = suppliers.get(receipt.getSupplierId());
      Map<String, String> full = new LinkedHashMap<>();
      full.put("poNumber", order == null ? "" : blank(order.getPoNumber()));
      full.put("supplierName", supplier == null ? "" : blank(supplier.getLegalName()));
      full.put("sku", blank(line.getSku()));
      full.put(
          "receivedQty",
          qty(
              line.getAcceptedQuantity() == null
                  ? line.getQuantity()
                  : line.getAcceptedQuantity()));
      full.put(
          "receivedIst",
          receipt.getCheckedAt() == null ? "" : IST_TS.format(receipt.getCheckedAt()));
      full.put("branchCode", codes.getOrDefault(line.getBranchId(), ""));
      addIfMatch(rows, full, columns, filters);
    }
    return rows;
  }

  private List<Map<String, String>> expenses(
      UUID tenantId,
      List<UUID> branchIds,
      CustomReportPolicy.Window window,
      List<CustomReportPolicy.Field> columns,
      List<AppliedFilter> filters) {
    Map<UUID, String> codes = branchCodes(tenantId);
    List<Map<String, String>> rows = new ArrayList<>();
    for (Expense expense :
        expenseRepository.findPostedInWindow(
            tenantId, branchIds, ExpensePostingStatus.POSTED, window.from(), window.to())) {
      Map<String, String> full = new LinkedHashMap<>();
      full.put("categoryCode", blank(expense.getCategoryCode()));
      full.put("amountPaise", Long.toString(expense.getAmountPaise()));
      full.put(
          "spentIst", expense.getOccurredOn() == null ? "" : expense.getOccurredOn().toString());
      full.put("notes", blank(expense.getNotes()));
      full.put("branchCode", codes.getOrDefault(expense.getBranchId(), ""));
      addIfMatch(rows, full, columns, filters);
    }
    return rows;
  }

  private Actor authorize(AuthPrincipal principal) {
    if (principal == null || principal.tenantId() == null) {
      throw CustomReportPolicy.forbidden();
    }
    AppUser user =
        appUserRepository
            .findById(principal.userId())
            .filter(row -> row.getDeletedAt() == null)
            .orElseThrow(CustomReportPolicy::forbidden);
    Set<ModuleCode> modules = accessQueryService.effectiveModules(user);
    CustomReportPolicy.requireAccess(user.getRole(), modules);
    return new Actor(principal.tenantId(), user);
  }

  private List<AppliedFilter> parseFilters(
      CustomReportDataset dataset, List<CustomReportQuery.Filter> raw) {
    List<CustomReportQuery.Filter> filters = raw == null ? List.of() : raw;
    CustomReportPolicy.requireFilterCount(filters.size());
    List<AppliedFilter> parsed = new ArrayList<>();
    for (CustomReportQuery.Filter filter : filters) {
      if (filter == null) {
        throw CustomReportPolicy.shape();
      }
      CustomReportPolicy.Field field = CustomReportPolicy.requireField(dataset, filter.field());
      CustomReportOperator operator =
          CustomReportPolicy.requireOperator(field.kind(), filter.operator());
      String value = CustomReportPolicy.requireFilterValue(operator, filter.value());
      parsed.add(new AppliedFilter(field.key(), field.kind(), operator, value));
    }
    return List.copyOf(parsed);
  }

  private List<UUID> resolveBranches(
      AuthPrincipal principal, AppUser user, UUID requested, String scope) {
    UUID tenantId = principal.tenantId();
    if (requested != null) {
      requireAccessibleBranch(principal, user, tenantId, requested);
      return List.of(requested);
    }
    if (CustomReportPolicy.SCOPE_TENANT.equals(scope)) {
      List<UUID> ids =
          locationRepository
              .findAllByTenantIdAndDeletedAtIsNullOrderByBranchCodeAsc(tenantId)
              .stream()
              .map(Location::getId)
              .toList();
      if (ids.isEmpty()) {
        throw CustomReportPolicy.notFound();
      }
      return ids;
    }
    UUID session = principal.activeBranchId();
    if (session == null) {
      throw CustomReportPolicy.noActiveBranch();
    }
    requireAccessibleBranch(principal, user, tenantId, session);
    return List.of(session);
  }

  private void requireAccessibleBranch(
      AuthPrincipal principal, AppUser user, UUID tenantId, UUID branchId) {
    Location branch =
        locationRepository
            .findByIdAndTenantIdAndDeletedAtIsNull(branchId, tenantId)
            .orElseThrow(CustomReportPolicy::notFound);
    if (user.getRole() == AppUserRole.pharmacy_owner) {
      return;
    }
    if (!userBranchRepository.existsByTenantIdAndUserIdAndBranchId(
        tenantId, principal.userId(), branch.getId())) {
      throw CustomReportPolicy.notFound();
    }
  }

  private Map<UUID, String> branchCodes(UUID tenantId) {
    Map<UUID, String> codes = new HashMap<>();
    for (Location branch :
        locationRepository.findAllByTenantIdAndDeletedAtIsNullOrderByBranchCodeAsc(tenantId)) {
      codes.put(branch.getId(), blank(branch.getBranchCode()));
    }
    return codes;
  }

  private Map<UUID, Customer> customersById(UUID tenantId, List<UUID> ids) {
    if (ids.isEmpty()) {
      return Map.of();
    }
    Map<UUID, Customer> byId = new HashMap<>();
    for (Customer customer : customerRepository.findAllByTenantIdAndIdIn(tenantId, ids)) {
      byId.put(customer.getId(), customer);
    }
    return byId;
  }

  private Map<UUID, Product> productsById(UUID tenantId, List<UUID> ids) {
    if (ids.isEmpty()) {
      return Map.of();
    }
    Map<UUID, Product> byId = new HashMap<>();
    for (Product product : productRepository.findAllByTenantIdAndIdIn(tenantId, ids)) {
      byId.put(product.getId(), product);
    }
    return byId;
  }

  private Map<UUID, StockBatch> batchesById(UUID tenantId, List<UUID> ids) {
    if (ids.isEmpty()) {
      return Map.of();
    }
    Map<UUID, StockBatch> byId = new HashMap<>();
    for (StockBatch batch : stockBatchRepository.findAllByTenantIdAndIdIn(tenantId, ids)) {
      byId.put(batch.getId(), batch);
    }
    return byId;
  }

  private static void addIfMatch(
      List<Map<String, String>> rows,
      Map<String, String> full,
      List<CustomReportPolicy.Field> columns,
      List<AppliedFilter> filters) {
    if (matches(full, filters)) {
      rows.add(project(full, columns));
    }
  }

  private static boolean matches(Map<String, String> row, List<AppliedFilter> filters) {
    for (AppliedFilter filter : filters) {
      if (!matchesOne(row.getOrDefault(filter.key(), ""), filter)) {
        return false;
      }
    }
    return true;
  }

  private static boolean matchesOne(String cell, AppliedFilter filter) {
    String left = cell == null ? "" : cell;
    String right = filter.value();
    return switch (filter.operator()) {
      case EQ -> compare(filter.kind(), left, right) == 0;
      case NEQ -> compare(filter.kind(), left, right) != 0;
      case CONTAINS -> left.toLowerCase(Locale.ROOT).contains(right.toLowerCase(Locale.ROOT));
      case GT -> compare(filter.kind(), left, right) > 0;
      case GTE -> compare(filter.kind(), left, right) >= 0;
      case LT -> compare(filter.kind(), left, right) < 0;
      case LTE -> compare(filter.kind(), left, right) <= 0;
    };
  }

  private static int compare(CustomReportFieldKind kind, String left, String right) {
    if (kind == CustomReportFieldKind.TEXT) {
      return left.compareToIgnoreCase(right);
    }
    if (kind == CustomReportFieldKind.DATE) {
      LocalDate a = parseDate(left);
      LocalDate b = parseDate(right);
      if (a == null || b == null) {
        return left.compareTo(right);
      }
      return a.compareTo(b);
    }
    try {
      return new BigDecimal(left.isBlank() ? "0" : left)
          .compareTo(new BigDecimal(right.isBlank() ? "0" : right));
    } catch (NumberFormatException ex) {
      return left.compareTo(right);
    }
  }

  private static LocalDate parseDate(String raw) {
    if (raw == null || raw.length() < 10) {
      return null;
    }
    try {
      return LocalDate.parse(raw.substring(0, 10));
    } catch (RuntimeException ex) {
      return null;
    }
  }

  private static Map<String, String> project(
      Map<String, String> full, List<CustomReportPolicy.Field> columns) {
    Map<String, String> row = new LinkedHashMap<>();
    for (CustomReportPolicy.Field field : columns) {
      row.put(field.key(), full.getOrDefault(field.key(), ""));
    }
    return row;
  }

  private static String csv(List<String> columns, List<Map<String, String>> items) {
    StringBuilder out = new StringBuilder();
    List<String> header = new ArrayList<>();
    for (String column : columns) {
      header.add(CustomReportPolicy.csvCell(column));
    }
    out.append(String.join(",", header)).append('\n');
    for (Map<String, String> item : items) {
      List<String> cells = new ArrayList<>();
      for (String column : columns) {
        cells.add(CustomReportPolicy.csvCell(item.getOrDefault(column, "")));
      }
      out.append(String.join(",", cells)).append('\n');
    }
    return out.toString();
  }

  private static UUID parseUuid(String raw) {
    if (raw == null || raw.isBlank()) {
      return null;
    }
    try {
      return UUID.fromString(raw.trim());
    } catch (IllegalArgumentException ex) {
      throw CustomReportPolicy.shape();
    }
  }

  private static String blank(String value) {
    return value == null ? "" : value;
  }

  private static String qty(BigDecimal value) {
    if (value == null) {
      return "0";
    }
    return value.stripTrailingZeros().toPlainString();
  }

  private static String slug(CustomReportDataset dataset) {
    return dataset.name().toLowerCase(Locale.ROOT) + "-report";
  }

  private static String datasetLabel(CustomReportDataset dataset) {
    return switch (dataset) {
      case SALES -> "Till bills";
      case STOCK -> "Stock moves";
      case CUSTOMERS -> "Patients";
      case PURCHASES -> "Stockist deliveries";
      case EXPENSES -> "Shop spend";
    };
  }

  private static String operatorLabel(CustomReportOperator operator) {
    return switch (operator) {
      case EQ -> "is";
      case NEQ -> "is not";
      case CONTAINS -> "contains";
      case GT -> "greater than";
      case GTE -> "at least";
      case LT -> "less than";
      case LTE -> "at most";
    };
  }

  private record Actor(UUID tenantId, AppUser user) {}

  private record AppliedFilter(
      String key, CustomReportFieldKind kind, CustomReportOperator operator, String value) {}

  private record Table(
      CustomReportDataset dataset,
      LocalDate from,
      LocalDate to,
      String scope,
      UUID branchId,
      List<String> columns,
      List<Map<String, String>> rows) {}
}
