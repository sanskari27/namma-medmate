package com.nammamedmate.server.application.finance;

import com.nammamedmate.server.application.audit.AuditRecordCommand;
import com.nammamedmate.server.application.audit.AuditService;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.Expense;
import com.nammamedmate.server.domain.ExpensePostingStatus;
import com.nammamedmate.server.domain.FinanceReportKey;
import com.nammamedmate.server.domain.FinanceReportPolicy;
import com.nammamedmate.server.domain.GoodsReceipt;
import com.nammamedmate.server.domain.GoodsReceiptLine;
import com.nammamedmate.server.domain.GoodsReceiptStatus;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.PaymentMode;
import com.nammamedmate.server.domain.PurchaseOrderLine;
import com.nammamedmate.server.domain.SalesInvoice;
import com.nammamedmate.server.domain.SalesInvoiceLine;
import com.nammamedmate.server.domain.SalesInvoicePayment;
import com.nammamedmate.server.domain.SalesInvoiceStatus;
import com.nammamedmate.server.domain.SalesReturn;
import com.nammamedmate.server.domain.StockMovement;
import com.nammamedmate.server.domain.StockMovementType;
import com.nammamedmate.server.domain.Supplier;
import com.nammamedmate.server.domain.SupplierLedgerEntry;
import com.nammamedmate.server.domain.SupplierLedgerType;
import com.nammamedmate.server.infrastructure.pdf.FinanceReportPdfRenderer;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.ExpenseRepository;
import com.nammamedmate.server.persistence.GoodsReceiptLineRepository;
import com.nammamedmate.server.persistence.GoodsReceiptRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.PurchaseOrderLineRepository;
import com.nammamedmate.server.persistence.SalesInvoiceLineRepository;
import com.nammamedmate.server.persistence.SalesInvoicePaymentRepository;
import com.nammamedmate.server.persistence.SalesInvoiceRepository;
import com.nammamedmate.server.persistence.SalesReturnRepository;
import com.nammamedmate.server.persistence.StockMovementRepository;
import com.nammamedmate.server.persistence.SupplierLedgerEntryRepository;
import com.nammamedmate.server.persistence.SupplierRepository;
import com.nammamedmate.server.persistence.UserBranchRepository;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FinanceReportService {

  private static final DateTimeFormatter IST_TS =
      DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm").withZone(FinanceReportPolicy.IST);

  private final SalesInvoiceRepository salesInvoiceRepository;
  private final SalesInvoiceLineRepository salesInvoiceLineRepository;
  private final SalesInvoicePaymentRepository salesInvoicePaymentRepository;
  private final SalesReturnRepository salesReturnRepository;
  private final StockMovementRepository stockMovementRepository;
  private final ExpenseRepository expenseRepository;
  private final SupplierLedgerEntryRepository supplierLedgerRepository;
  private final SupplierRepository supplierRepository;
  private final GoodsReceiptRepository goodsReceiptRepository;
  private final GoodsReceiptLineRepository goodsReceiptLineRepository;
  private final PurchaseOrderLineRepository purchaseOrderLineRepository;
  private final LocationRepository locationRepository;
  private final UserBranchRepository userBranchRepository;
  private final FinanceAccessService financeAccessService;
  private final AuditService auditService;
  private final FinanceReportPdfRenderer pdfRenderer;
  private final Clock clock;

  public FinanceReportService(
      SalesInvoiceRepository salesInvoiceRepository,
      SalesInvoiceLineRepository salesInvoiceLineRepository,
      SalesInvoicePaymentRepository salesInvoicePaymentRepository,
      SalesReturnRepository salesReturnRepository,
      StockMovementRepository stockMovementRepository,
      ExpenseRepository expenseRepository,
      SupplierLedgerEntryRepository supplierLedgerRepository,
      SupplierRepository supplierRepository,
      GoodsReceiptRepository goodsReceiptRepository,
      GoodsReceiptLineRepository goodsReceiptLineRepository,
      PurchaseOrderLineRepository purchaseOrderLineRepository,
      LocationRepository locationRepository,
      UserBranchRepository userBranchRepository,
      FinanceAccessService financeAccessService,
      AuditService auditService,
      FinanceReportPdfRenderer pdfRenderer,
      Clock clock) {
    this.salesInvoiceRepository = salesInvoiceRepository;
    this.salesInvoiceLineRepository = salesInvoiceLineRepository;
    this.salesInvoicePaymentRepository = salesInvoicePaymentRepository;
    this.salesReturnRepository = salesReturnRepository;
    this.stockMovementRepository = stockMovementRepository;
    this.expenseRepository = expenseRepository;
    this.supplierLedgerRepository = supplierLedgerRepository;
    this.supplierRepository = supplierRepository;
    this.goodsReceiptRepository = goodsReceiptRepository;
    this.goodsReceiptLineRepository = goodsReceiptLineRepository;
    this.purchaseOrderLineRepository = purchaseOrderLineRepository;
    this.locationRepository = locationRepository;
    this.userBranchRepository = userBranchRepository;
    this.financeAccessService = financeAccessService;
    this.auditService = auditService;
    this.pdfRenderer = pdfRenderer;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public FinanceReportCatalogView catalog(AuthPrincipal principal, String branchId, String scope) {
    resolve(principal, null, null, branchId, scope, false);
    List<FinanceReportCatalogItem> items = new ArrayList<>();
    for (FinanceReportKey key : FinanceReportPolicy.catalog()) {
      items.add(new FinanceReportCatalogItem(key.name(), key.title(), key.filters()));
    }
    return new FinanceReportCatalogView(items);
  }

  @Transactional(readOnly = true)
  public FinanceReportTableView table(
      AuthPrincipal principal,
      String key,
      LocalDate from,
      LocalDate to,
      String branchId,
      String scope) {
    FinanceReportKey report = FinanceReportPolicy.requireKey(key);
    QueryScope query =
        resolve(principal, from, to, branchId, scope, report == FinanceReportKey.BRANCH_PNL);
    return build(query, report);
  }

  @Transactional
  public FinanceReportExport export(
      AuthPrincipal principal,
      String key,
      String format,
      LocalDate from,
      LocalDate to,
      String branchId,
      String scope) {
    String kind = FinanceReportPolicy.requireFormat(format);
    FinanceReportTableView table = table(principal, key, from, to, branchId, scope);
    FinanceReportPolicy.requireExportSize(table.items().size());
    String slug = table.key().toLowerCase(Locale.ROOT).replace('_', '-') + "-shop-book";
    auditService.record(
        new AuditRecordCommand(
            principal.userId(),
            principal.tenantId(),
            principal.activeBranchId(),
            FinanceReportPolicy.ACTION,
            AuditService.OUTCOME_SUCCESS,
            null,
            null,
            null,
            principal.sessionId(),
            "{\"key\":\"" + table.key() + "\",\"format\":\"" + kind + "\"}"));
    if ("pdf".equals(kind)) {
      return new FinanceReportExport(
          slug + ".pdf",
          "application/pdf",
          pdfRenderer.render(table.title(), table.columns(), table.items()));
    }
    return new FinanceReportExport(
        slug + ".csv",
        "text/csv",
        csv(table.columns(), table.items()).getBytes(StandardCharsets.UTF_8));
  }

  private FinanceReportTableView build(QueryScope query, FinanceReportKey key) {
    Instant generatedAt = Instant.now(clock);
    return switch (key) {
      case DAY_BOOK -> dayBook(query, generatedAt);
      case SALES_SUMMARY -> salesSummary(query, generatedAt);
      case PURCHASE_SUMMARY -> purchaseSummary(query, generatedAt);
      case EXPENSE_SUMMARY -> expenseSummary(query, generatedAt);
      case PROFIT_AND_LOSS -> profitAndLoss(query, generatedAt);
      case GSTR1 -> gstr1(query, generatedAt);
      case GSTR3B -> gstr3b(query, generatedAt);
      case BRANCH_PNL -> branchPnl(query, generatedAt);
    };
  }

  private FinanceReportTableView dayBook(QueryScope query, Instant generatedAt) {
    List<Map<String, String>> items = new ArrayList<>();
    long cashLike = 0L;
    long khata = 0L;
    List<SalesInvoice> invoices = completed(query);
    Map<UUID, List<SalesInvoicePayment>> payments = paymentsByInvoice(query.tenantId(), invoices);
    for (SalesInvoice invoice : invoices) {
      for (SalesInvoicePayment payment : payments.getOrDefault(invoice.getId(), List.of())) {
        boolean credit = payment.getMode() == PaymentMode.CREDIT;
        if (credit) {
          khata += payment.getAmountPaise();
        } else {
          cashLike += payment.getAmountPaise();
        }
        items.add(
            row(
                "occurredIst",
                IST_TS.format(invoice.getCompletedAt()),
                "kind",
                credit ? "Khata" : label(payment.getMode()),
                "reference",
                invoice.getInvoiceNumber(),
                "amountPaise",
                Long.toString(payment.getAmountPaise())));
      }
    }
    long spend = 0L;
    for (Expense expense : postedExpenses(query)) {
      spend += expense.getAmountPaise();
      items.add(
          row(
              "occurredIst",
              expense.getOccurredOn().toString(),
              "kind",
              "Shop spend",
              "reference",
              expense.getCategoryLabel(),
              "amountPaise",
              Long.toString(expense.getAmountPaise())));
    }
    long stockist = 0L;
    Map<UUID, String> suppliers = supplierNames(query.tenantId());
    for (SupplierLedgerEntry entry : ledger(query)) {
      if (entry.getType() != SupplierLedgerType.PAYMENT) {
        continue;
      }
      stockist += entry.getAmountPaise();
      items.add(
          row(
              "occurredIst",
              IST_TS.format(entry.getOccurredAt()),
              "kind",
              "Stockist payment",
              "reference",
              suppliers.getOrDefault(entry.getSupplierId(), ""),
              "amountPaise",
              Long.toString(entry.getAmountPaise())));
    }
    for (SalesReturn ret : returns(query)) {
      items.add(
          row(
              "occurredIst",
              IST_TS.format(ret.getCreatedAt()),
              "kind",
              "Take-back",
              "reference",
              ret.getRefundMode().name(),
              "amountPaise",
              Long.toString(-ret.getRefundTotalPaise())));
    }
    items.sort(Comparator.comparing(row -> row.getOrDefault("occurredIst", "")));
    return view(
        query,
        FinanceReportKey.DAY_BOOK,
        List.of(
            total("cashLike", "Cash-like collected", cashLike),
            total("khata", "Khata", khata),
            total("spend", "Shop spend", spend),
            total("stockistPayments", "Stockist payments", stockist)),
        List.of("occurredIst", "kind", "reference", "amountPaise"),
        items,
        generatedAt);
  }

  private FinanceReportTableView salesSummary(QueryScope query, Instant generatedAt) {
    List<SalesInvoice> invoices = completed(query);
    List<Map<String, String>> items = new ArrayList<>();
    long taxable = 0L;
    long tax = 0L;
    long grand = 0L;
    long walkIn = 0L;
    long billed = 0L;
    for (SalesInvoice invoice : invoices) {
      taxable += invoice.getSubtotalPaise();
      tax += invoice.getTaxPaise();
      grand += invoice.getTotalPaise();
      boolean walk = invoice.getCustomerId() == null;
      if (walk) {
        walkIn += invoice.getTotalPaise();
      } else {
        billed += invoice.getTotalPaise();
      }
      items.add(
          row(
              "invoiceNumber",
              invoice.getInvoiceNumber(),
              "dateIst",
              IST_TS.format(invoice.getCompletedAt()),
              "walkIn",
              walk ? "yes" : "no",
              "taxablePaise",
              Long.toString(invoice.getSubtotalPaise()),
              "cgstPaise",
              Long.toString(invoice.getCgstPaise()),
              "sgstPaise",
              Long.toString(invoice.getSgstPaise()),
              "igstPaise",
              Long.toString(invoice.getIgstPaise()),
              "totalPaise",
              Long.toString(invoice.getTotalPaise())));
    }
    return view(
        query,
        FinanceReportKey.SALES_SUMMARY,
        List.of(
            total("invoiceCount", "Bills", invoices.size()),
            total("taxable", "Taxable", taxable),
            total("tax", "GST", tax),
            total("grandTotal", "Grand total", grand),
            total("walkIn", "Walk-in", walkIn),
            total("billed", "Billed", billed)),
        List.of(
            "invoiceNumber",
            "dateIst",
            "walkIn",
            "taxablePaise",
            "cgstPaise",
            "sgstPaise",
            "igstPaise",
            "totalPaise"),
        items,
        generatedAt);
  }

  private FinanceReportTableView purchaseSummary(QueryScope query, Instant generatedAt) {
    Map<UUID, long[]> bySupplier = new LinkedHashMap<>();
    for (SupplierLedgerEntry entry : ledger(query)) {
      long[] acc = bySupplier.computeIfAbsent(entry.getSupplierId(), ignored -> new long[2]);
      if (entry.getType() == SupplierLedgerType.INVOICE) {
        acc[0] += entry.getAmountPaise();
      } else if (entry.getType() == SupplierLedgerType.DEBIT_NOTE) {
        acc[1] += entry.getAmountPaise();
      }
    }
    Map<UUID, String> names = supplierNames(query.tenantId());
    List<Map<String, String>> items = new ArrayList<>();
    long net = 0L;
    for (Map.Entry<UUID, long[]> entry : bySupplier.entrySet()) {
      long invoices = entry.getValue()[0];
      long debit = entry.getValue()[1];
      long rowNet = invoices - debit;
      net += rowNet;
      items.add(
          row(
              "supplier",
              names.getOrDefault(entry.getKey(), ""),
              "invoicesPaise",
              Long.toString(invoices),
              "debitNotesPaise",
              Long.toString(debit),
              "netPaise",
              Long.toString(rowNet)));
    }
    return view(
        query,
        FinanceReportKey.PURCHASE_SUMMARY,
        List.of(total("netPurchases", "Net stockist invoices", net)),
        List.of("supplier", "invoicesPaise", "debitNotesPaise", "netPaise"),
        items,
        generatedAt);
  }

  private FinanceReportTableView expenseSummary(QueryScope query, Instant generatedAt) {
    Map<String, Long> byCategory = new LinkedHashMap<>();
    long total = 0L;
    for (Expense expense : postedExpenses(query)) {
      byCategory.merge(expense.getCategoryLabel(), expense.getAmountPaise(), Long::sum);
      total += expense.getAmountPaise();
    }
    List<Map<String, String>> items = new ArrayList<>();
    for (Map.Entry<String, Long> entry : byCategory.entrySet()) {
      items.add(row("category", entry.getKey(), "amountPaise", Long.toString(entry.getValue())));
    }
    return view(
        query,
        FinanceReportKey.EXPENSE_SUMMARY,
        List.of(total("postedSpend", "Posted spend", total)),
        List.of("category", "amountPaise"),
        items,
        generatedAt);
  }

  private FinanceReportTableView profitAndLoss(QueryScope query, Instant generatedAt) {
    Pnl pnl = pnl(query);
    List<Map<String, String>> items =
        List.of(
            row("line", "Revenue", "amountPaise", Long.toString(pnl.revenue)),
            row("line", "Purchase-price COGS", "amountPaise", Long.toString(pnl.cogs)),
            row("line", "Posted spend", "amountPaise", Long.toString(pnl.expenses)),
            row("line", "Profit", "amountPaise", Long.toString(pnl.profit)));
    return view(
        query,
        FinanceReportKey.PROFIT_AND_LOSS,
        List.of(
            total("revenue", "Revenue", pnl.revenue),
            total("cogs", "COGS", pnl.cogs),
            total("expenses", "Spend", pnl.expenses),
            total("profit", "Profit", pnl.profit)),
        List.of("line", "amountPaise"),
        items,
        generatedAt);
  }

  private FinanceReportTableView gstr1(QueryScope query, Instant generatedAt) {
    List<SalesInvoice> invoices = completed(query);
    List<SalesInvoiceLine> lines =
        invoices.isEmpty()
            ? List.of()
            : salesInvoiceLineRepository.findAllByTenantIdAndSalesInvoiceIdIn(
                query.tenantId(), invoices.stream().map(SalesInvoice::getId).toList());
    Map<UUID, List<SalesInvoiceLine>> byInvoice = new HashMap<>();
    for (SalesInvoiceLine line : lines) {
      byInvoice.computeIfAbsent(line.getSalesInvoiceId(), ignored -> new ArrayList<>()).add(line);
    }
    List<Map<String, String>> items = new ArrayList<>();
    long b2bTaxable = 0L;
    long b2csTaxable = 0L;
    long creditNotes = 0L;
    long outputTax = 0L;
    for (SalesInvoice invoice : invoices) {
      boolean b2b = FinanceReportPolicy.b2b(invoice.getCustomerGstin());
      if (b2b) {
        b2bTaxable += invoice.getSubtotalPaise();
      } else {
        b2csTaxable += invoice.getSubtotalPaise();
      }
      outputTax += invoice.getTaxPaise();
      List<SalesInvoiceLine> invoiceLines = byInvoice.getOrDefault(invoice.getId(), List.of());
      if (invoiceLines.isEmpty()) {
        items.add(
            gstRow(
                b2b ? "B2B" : "B2CS",
                invoice.getInvoiceNumber(),
                invoice.getCustomerGstin(),
                "",
                invoice.getSubtotalPaise(),
                invoice.getCgstPaise(),
                invoice.getSgstPaise(),
                invoice.getIgstPaise(),
                invoice.getTotalPaise()));
        continue;
      }
      for (SalesInvoiceLine line : invoiceLines) {
        items.add(
            gstRow(
                b2b ? "B2B" : "B2CS",
                invoice.getInvoiceNumber(),
                invoice.getCustomerGstin(),
                line.getHsnCode(),
                line.getLineTaxablePaise(),
                line.getCgstPaise(),
                line.getSgstPaise(),
                line.getIgstPaise(),
                line.getLineTotalPaise()));
      }
    }
    Map<UUID, SalesInvoice> invoiceById = new HashMap<>();
    for (SalesInvoice invoice : invoices) {
      invoiceById.put(invoice.getId(), invoice);
    }
    List<UUID> returnInvoiceIds =
        returns(query).stream().map(SalesReturn::getSalesInvoiceId).distinct().toList();
    if (!returnInvoiceIds.isEmpty()) {
      for (SalesInvoice invoice :
          salesInvoiceRepository.findAllByTenantIdAndIdIn(query.tenantId(), returnInvoiceIds)) {
        invoiceById.put(invoice.getId(), invoice);
      }
    }
    for (SalesReturn ret : returns(query)) {
      SalesInvoice source = invoiceById.get(ret.getSalesInvoiceId());
      long taxable =
          source == null
              ? 0L
              : FinanceReportPolicy.proportion(
                  ret.getRefundTotalPaise(), source.getTotalPaise(), source.getSubtotalPaise());
      long cgst =
          source == null
              ? 0L
              : FinanceReportPolicy.proportion(
                  ret.getRefundTotalPaise(), source.getTotalPaise(), source.getCgstPaise());
      long sgst =
          source == null
              ? 0L
              : FinanceReportPolicy.proportion(
                  ret.getRefundTotalPaise(), source.getTotalPaise(), source.getSgstPaise());
      long igst =
          source == null
              ? 0L
              : FinanceReportPolicy.proportion(
                  ret.getRefundTotalPaise(), source.getTotalPaise(), source.getIgstPaise());
      creditNotes += ret.getRefundTotalPaise();
      outputTax -= (cgst + sgst + igst);
      items.add(
          gstRow(
              "CDNR",
              source == null ? "" : source.getInvoiceNumber(),
              source == null ? null : source.getCustomerGstin(),
              "",
              -taxable,
              -cgst,
              -sgst,
              -igst,
              -ret.getRefundTotalPaise()));
    }
    return view(
        query,
        FinanceReportKey.GSTR1,
        List.of(
            total("b2bTaxable", "B2B taxable", b2bTaxable),
            total("b2csTaxable", "B2CS taxable", b2csTaxable),
            total("creditNotes", "Credit notes", creditNotes),
            total("outputTax", "Output tax", outputTax)),
        List.of(
            "section",
            "invoiceNumber",
            "gstin",
            "hsn",
            "taxablePaise",
            "cgstPaise",
            "sgstPaise",
            "igstPaise",
            "totalPaise"),
        items,
        generatedAt);
  }

  private FinanceReportTableView gstr3b(QueryScope query, Instant generatedAt) {
    List<SalesInvoice> invoices = completed(query);
    long outwardTaxable = 0L;
    long cgst = 0L;
    long sgst = 0L;
    long igst = 0L;
    for (SalesInvoice invoice : invoices) {
      outwardTaxable += invoice.getSubtotalPaise();
      cgst += invoice.getCgstPaise();
      sgst += invoice.getSgstPaise();
      igst += invoice.getIgstPaise();
    }
    Map<UUID, SalesInvoice> invoiceById = new HashMap<>();
    for (SalesInvoice invoice : invoices) {
      invoiceById.put(invoice.getId(), invoice);
    }
    List<UUID> returnInvoiceIds =
        returns(query).stream().map(SalesReturn::getSalesInvoiceId).distinct().toList();
    if (!returnInvoiceIds.isEmpty()) {
      for (SalesInvoice invoice :
          salesInvoiceRepository.findAllByTenantIdAndIdIn(query.tenantId(), returnInvoiceIds)) {
        invoiceById.putIfAbsent(invoice.getId(), invoice);
      }
    }
    for (SalesReturn ret : returns(query)) {
      SalesInvoice source = invoiceById.get(ret.getSalesInvoiceId());
      if (source == null) {
        continue;
      }
      outwardTaxable -=
          FinanceReportPolicy.proportion(
              ret.getRefundTotalPaise(), source.getTotalPaise(), source.getSubtotalPaise());
      cgst -=
          FinanceReportPolicy.proportion(
              ret.getRefundTotalPaise(), source.getTotalPaise(), source.getCgstPaise());
      sgst -=
          FinanceReportPolicy.proportion(
              ret.getRefundTotalPaise(), source.getTotalPaise(), source.getSgstPaise());
      igst -=
          FinanceReportPolicy.proportion(
              ret.getRefundTotalPaise(), source.getTotalPaise(), source.getIgstPaise());
    }
    long itc = inwardItc(query);
    long output = cgst + sgst + igst;
    long payable = output - itc;
    List<Map<String, String>> items =
        List.of(
            row(
                "outwardTaxablePaise",
                Long.toString(outwardTaxable),
                "cgstPaise",
                Long.toString(cgst),
                "sgstPaise",
                Long.toString(sgst),
                "igstPaise",
                Long.toString(igst),
                "itcPaise",
                Long.toString(itc),
                "payablePaise",
                Long.toString(payable)));
    return view(
        query,
        FinanceReportKey.GSTR3B,
        List.of(
            total("outwardTaxable", "Outward taxable", outwardTaxable),
            total("outputTax", "Output tax", output),
            total("itc", "ITC", itc),
            total("payable", "Net payable", payable)),
        List.of(
            "outwardTaxablePaise",
            "cgstPaise",
            "sgstPaise",
            "igstPaise",
            "itcPaise",
            "payablePaise"),
        items,
        generatedAt);
  }

  private FinanceReportTableView branchPnl(QueryScope query, Instant generatedAt) {
    Map<UUID, String> names = new LinkedHashMap<>();
    for (Location branch :
        locationRepository.findAllByTenantIdAndDeletedAtIsNullOrderByBranchCodeAsc(
            query.tenantId())) {
      names.put(branch.getId(), branch.getName());
    }
    List<Map<String, String>> items = new ArrayList<>();
    long revenue = 0L;
    long cogs = 0L;
    long expenses = 0L;
    long profit = 0L;
    for (UUID branchId : query.branchIds()) {
      QueryScope one =
          new QueryScope(
              query.tenantId(),
              query.from(),
              query.to(),
              query.start(),
              query.endExclusive(),
              false,
              List.of(branchId));
      Pnl pnl = pnl(one);
      revenue += pnl.revenue;
      cogs += pnl.cogs;
      expenses += pnl.expenses;
      profit += pnl.profit;
      items.add(
          row(
              "branchId",
              branchId.toString(),
              "branchName",
              names.getOrDefault(branchId, ""),
              "revenuePaise",
              Long.toString(pnl.revenue),
              "cogsPaise",
              Long.toString(pnl.cogs),
              "expensesPaise",
              Long.toString(pnl.expenses),
              "profitPaise",
              Long.toString(pnl.profit)));
    }
    return view(
        query,
        FinanceReportKey.BRANCH_PNL,
        List.of(
            total("revenue", "Revenue", revenue),
            total("cogs", "COGS", cogs),
            total("expenses", "Spend", expenses),
            total("profit", "Profit", profit)),
        List.of(
            "branchId", "branchName", "revenuePaise", "cogsPaise", "expensesPaise", "profitPaise"),
        items,
        generatedAt);
  }

  private Pnl pnl(QueryScope query) {
    long revenue = 0L;
    for (SalesInvoice invoice : completed(query)) {
      revenue += invoice.getTotalPaise();
    }
    for (SalesReturn ret : returns(query)) {
      revenue -= ret.getRefundTotalPaise();
    }
    long cogs = 0L;
    List<StockMovement> movements =
        stockMovementRepository.findByTypesInWindow(
            query.tenantId(),
            query.branchIds(),
            EnumSet.of(StockMovementType.STOCK_OUT, StockMovementType.SALES_RETURN),
            query.start(),
            query.endExclusive());
    for (StockMovement movement : movements) {
      if (movement.getType() == StockMovementType.STOCK_OUT
          && FinanceReportPolicy.saleIssue(movement.getIdempotencyKey())) {
        cogs +=
            FinanceReportPolicy.cogsPaise(
                movement.getQuantity(), movement.getPurchasePricePaise(), true);
      } else if (movement.getType() == StockMovementType.SALES_RETURN
          && FinanceReportPolicy.salesReturnRestock(movement.getIdempotencyKey())) {
        cogs +=
            FinanceReportPolicy.cogsPaise(
                movement.getQuantity(), movement.getPurchasePricePaise(), false);
      }
    }
    long expenses = 0L;
    for (Expense expense : postedExpenses(query)) {
      expenses += expense.getAmountPaise();
    }
    return new Pnl(
        revenue, cogs, expenses, FinanceReportPolicy.profitPaise(revenue, cogs, expenses));
  }

  private long inwardItc(QueryScope query) {
    List<GoodsReceipt> receipts =
        goodsReceiptRepository.findCheckedInWindow(
            query.tenantId(),
            query.branchIds(),
            GoodsReceiptStatus.CHECKED,
            query.start(),
            query.endExclusive());
    if (receipts.isEmpty()) {
      return 0L;
    }
    List<UUID> receiptIds = receipts.stream().map(GoodsReceipt::getId).toList();
    List<GoodsReceiptLine> lines =
        goodsReceiptLineRepository.findAllByTenantIdAndGoodsReceiptIdIn(
            query.tenantId(), receiptIds);
    Set<UUID> poLineIds = new HashSet<>();
    for (GoodsReceiptLine line : lines) {
      poLineIds.add(line.getPurchaseOrderLineId());
    }
    if (poLineIds.isEmpty()) {
      return 0L;
    }
    Map<UUID, PurchaseOrderLine> poLines = new HashMap<>();
    for (PurchaseOrderLine line :
        purchaseOrderLineRepository.findAllByTenantIdAndIdIn(query.tenantId(), poLineIds)) {
      poLines.put(line.getId(), line);
    }
    long itc = 0L;
    for (GoodsReceiptLine line : lines) {
      PurchaseOrderLine poLine = poLines.get(line.getPurchaseOrderLineId());
      if (poLine == null) {
        continue;
      }
      itc +=
          FinanceReportPolicy.allocateTax(
              poLine.getLineTaxPaise(), line.getAcceptedQuantity(), poLine.getQuantity());
    }
    return itc;
  }

  private List<SalesInvoice> completed(QueryScope query) {
    return salesInvoiceRepository.findCompletedInWindow(
        query.tenantId(),
        query.branchIds(),
        SalesInvoiceStatus.COMPLETED,
        query.start(),
        query.endExclusive());
  }

  private Map<UUID, List<SalesInvoicePayment>> paymentsByInvoice(
      UUID tenantId, List<SalesInvoice> invoices) {
    if (invoices.isEmpty()) {
      return Map.of();
    }
    Map<UUID, List<SalesInvoicePayment>> byInvoice = new HashMap<>();
    for (SalesInvoicePayment payment :
        salesInvoicePaymentRepository.findAllByTenantIdAndSalesInvoiceIdIn(
            tenantId, invoices.stream().map(SalesInvoice::getId).toList())) {
      byInvoice
          .computeIfAbsent(payment.getSalesInvoiceId(), ignored -> new ArrayList<>())
          .add(payment);
    }
    return byInvoice;
  }

  private List<SalesReturn> returns(QueryScope query) {
    return salesReturnRepository.findAllInWindow(
        query.tenantId(), query.branchIds(), query.start(), query.endExclusive());
  }

  private List<Expense> postedExpenses(QueryScope query) {
    return expenseRepository.findPostedInWindow(
        query.tenantId(), query.branchIds(), ExpensePostingStatus.POSTED, query.from(), query.to());
  }

  private List<SupplierLedgerEntry> ledger(QueryScope query) {
    return supplierLedgerRepository.findAllInWindow(
        query.tenantId(), query.branchIds(), query.start(), query.endExclusive());
  }

  private Map<UUID, String> supplierNames(UUID tenantId) {
    Map<UUID, String> names = new HashMap<>();
    for (Supplier supplier : supplierRepository.findAllByTenantIdOrderByLegalNameAsc(tenantId)) {
      names.put(supplier.getId(), supplier.getLegalName());
    }
    return names;
  }

  private QueryScope resolve(
      AuthPrincipal principal,
      LocalDate fromRaw,
      LocalDate toRaw,
      String branchIdRaw,
      String scope,
      boolean branchPnl) {
    Context ctx = requireFinance(principal);
    Instant now = clock.instant();
    LocalDate[] window = FinanceReportPolicy.resolveWindow(fromRaw, toRaw, now);
    boolean tenantScope = "tenant".equalsIgnoreCase(scope == null ? "" : scope.trim());
    if (branchPnl) {
      if (principal.role() != AppUserRole.pharmacy_owner) {
        throw FinanceReportPolicy.forbidden();
      }
      tenantScope = true;
    }
    List<UUID> branchIds = resolveListBranches(principal, ctx, branchIdRaw, tenantScope);
    return new QueryScope(
        ctx.tenantId(),
        window[0],
        window[1],
        FinanceReportPolicy.startInstant(window[0]),
        FinanceReportPolicy.endExclusive(window[1]),
        tenantScope,
        branchIds);
  }

  private List<UUID> resolveListBranches(
      AuthPrincipal principal, Context ctx, String branchIdRaw, boolean tenantScope) {
    UUID requested = parseUuid(branchIdRaw);
    if (requested != null) {
      requireAccessibleBranch(principal, ctx, requested);
      return List.of(requested);
    }
    if (tenantScope) {
      if (principal.role() != AppUserRole.pharmacy_owner) {
        throw FinanceReportPolicy.forbidden();
      }
      List<UUID> ids =
          locationRepository
              .findAllByTenantIdAndDeletedAtIsNullOrderByBranchCodeAsc(ctx.tenantId())
              .stream()
              .map(Location::getId)
              .toList();
      if (ids.isEmpty()) {
        throw FinanceReportPolicy.notFound();
      }
      return ids;
    }
    if (ctx.sessionBranchId() == null) {
      throw FinanceReportPolicy.noActiveBranch();
    }
    requireAccessibleBranch(principal, ctx, ctx.sessionBranchId());
    return List.of(ctx.sessionBranchId());
  }

  private void requireAccessibleBranch(AuthPrincipal principal, Context ctx, UUID branchId) {
    Location branch =
        locationRepository
            .findByIdAndTenantIdAndDeletedAtIsNull(branchId, ctx.tenantId())
            .orElseThrow(FinanceReportPolicy::notFound);
    if (principal.role() == AppUserRole.pharmacy_owner) {
      return;
    }
    if (!userBranchRepository.existsByTenantIdAndUserIdAndBranchId(
        ctx.tenantId(), principal.userId(), branch.getId())) {
      throw FinanceReportPolicy.notFound();
    }
  }

  private Context requireFinance(AuthPrincipal principal) {
    FinanceAccessService.Context access = financeAccessService.requireFinance(principal);
    return new Context(access.tenantId(), access.sessionBranchId());
  }

  private static UUID parseUuid(String raw) {
    if (raw == null || raw.isBlank()) {
      return null;
    }
    try {
      return UUID.fromString(raw.trim());
    } catch (RuntimeException ex) {
      throw FinanceReportPolicy.shape();
    }
  }

  private FinanceReportTableView view(
      QueryScope query,
      FinanceReportKey key,
      List<FinanceReportTotal> totals,
      List<String> columns,
      List<Map<String, String>> items,
      Instant generatedAt) {
    return new FinanceReportTableView(
        key.name(),
        key.title(),
        query.from(),
        query.to(),
        query.tenantScope() ? "tenant" : "branch",
        query.tenantScope() ? null : query.branchIds().get(0),
        totals,
        columns,
        items,
        generatedAt);
  }

  private static FinanceReportTotal total(String key, String label, long amount) {
    return new FinanceReportTotal(key, label, amount);
  }

  private static Map<String, String> gstRow(
      String section,
      String invoiceNumber,
      String gstin,
      String hsn,
      long taxable,
      long cgst,
      long sgst,
      long igst,
      long total) {
    return row(
        "section",
        section,
        "invoiceNumber",
        invoiceNumber,
        "gstin",
        gstin == null ? "" : gstin,
        "hsn",
        hsn == null ? "" : hsn,
        "taxablePaise",
        Long.toString(taxable),
        "cgstPaise",
        Long.toString(cgst),
        "sgstPaise",
        Long.toString(sgst),
        "igstPaise",
        Long.toString(igst),
        "totalPaise",
        Long.toString(total));
  }

  private static Map<String, String> row(String... pairs) {
    Map<String, String> map = new LinkedHashMap<>();
    for (int i = 0; i < pairs.length; i += 2) {
      map.put(pairs[i], pairs[i + 1]);
    }
    return map;
  }

  private static String label(PaymentMode mode) {
    return switch (mode) {
      case CASH -> "Cash";
      case UPI -> "UPI";
      case CARD -> "Card";
      case BANK_TRANSFER -> "Bank";
      case CREDIT -> "Khata";
    };
  }

  private static String csv(List<String> columns, List<Map<String, String>> items) {
    StringBuilder out = new StringBuilder();
    out.append(String.join(",", columns)).append('\n');
    for (Map<String, String> item : items) {
      List<String> cells = new ArrayList<>();
      for (String column : columns) {
        String value = item.getOrDefault(column, "");
        cells.add(value.contains(",") ? "\"" + value.replace("\"", "\"\"") + "\"" : value);
      }
      out.append(String.join(",", cells)).append('\n');
    }
    return out.toString();
  }

  private record Context(UUID tenantId, UUID sessionBranchId) {}

  private record QueryScope(
      UUID tenantId,
      LocalDate from,
      LocalDate to,
      Instant start,
      Instant endExclusive,
      boolean tenantScope,
      List<UUID> branchIds) {}

  private static final class Pnl {
    private final long revenue;
    private final long cogs;
    private final long expenses;
    private final long profit;

    private Pnl(long revenue, long cogs, long expenses, long profit) {
      this.revenue = revenue;
      this.cogs = cogs;
      this.expenses = expenses;
      this.profit = profit;
    }
  }
}
