package com.nammamedmate.server.application.hospital;

import com.nammamedmate.server.application.access.AccessQueryService;
import com.nammamedmate.server.application.audit.AuditRecordCommand;
import com.nammamedmate.server.application.audit.AuditService;
import com.nammamedmate.server.application.branch.BranchAssignmentService;
import com.nammamedmate.server.application.subscription.SubscriptionService;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.BranchStatus;
import com.nammamedmate.server.domain.CustomReportPolicy;
import com.nammamedmate.server.domain.Customer;
import com.nammamedmate.server.domain.HospitalPolicy;
import com.nammamedmate.server.domain.HospitalWard;
import com.nammamedmate.server.domain.InvoiceSaleSource;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.ModuleCode;
import com.nammamedmate.server.domain.PaymentMode;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.SalesInvoice;
import com.nammamedmate.server.domain.SalesInvoicePayment;
import com.nammamedmate.server.domain.SalesInvoiceStatus;
import com.nammamedmate.server.infrastructure.pdf.FinanceReportPdfRenderer;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.CustomerRepository;
import com.nammamedmate.server.persistence.HospitalWardRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.SalesInvoicePaymentRepository;
import com.nammamedmate.server.persistence.SalesInvoiceRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class HospitalSalesRegisterService {

  private static final List<InvoiceSaleSource> TILE_ORDER =
      List.of(
          InvoiceSaleSource.OPD_RX,
          InvoiceSaleSource.COUNTER,
          InvoiceSaleSource.WARD,
          InvoiceSaleSource.EMERGENCY);
  private static final List<String> COLUMNS =
      List.of(
          "Invoice",
          "Date",
          "Source",
          "Patient",
          "Phone",
          "UHID",
          "Ward",
          "Payment",
          "Insurer",
          "Revenue",
          "Paid",
          "Unpaid",
          "Insurance");
  private static final DateTimeFormatter IST_TS =
      DateTimeFormatter.ofPattern("dd MMM yyyy HH:mm").withZone(HospitalPolicy.IST);

  private final AppUserRepository appUserRepository;
  private final LocationRepository locationRepository;
  private final SalesInvoiceRepository salesInvoiceRepository;
  private final SalesInvoicePaymentRepository salesInvoicePaymentRepository;
  private final CustomerRepository customerRepository;
  private final HospitalWardRepository hospitalWardRepository;
  private final AccessQueryService accessQueryService;
  private final SubscriptionService subscriptionService;
  private final BranchAssignmentService branchAssignmentService;
  private final FinanceReportPdfRenderer pdfRenderer;
  private final AuditService auditService;
  private final Clock clock;

  public HospitalSalesRegisterService(
      AppUserRepository appUserRepository,
      LocationRepository locationRepository,
      SalesInvoiceRepository salesInvoiceRepository,
      SalesInvoicePaymentRepository salesInvoicePaymentRepository,
      CustomerRepository customerRepository,
      HospitalWardRepository hospitalWardRepository,
      AccessQueryService accessQueryService,
      SubscriptionService subscriptionService,
      BranchAssignmentService branchAssignmentService,
      FinanceReportPdfRenderer pdfRenderer,
      AuditService auditService,
      Clock clock) {
    this.appUserRepository = appUserRepository;
    this.locationRepository = locationRepository;
    this.salesInvoiceRepository = salesInvoiceRepository;
    this.salesInvoicePaymentRepository = salesInvoicePaymentRepository;
    this.customerRepository = customerRepository;
    this.hospitalWardRepository = hospitalWardRepository;
    this.accessQueryService = accessQueryService;
    this.subscriptionService = subscriptionService;
    this.branchAssignmentService = branchAssignmentService;
    this.pdfRenderer = pdfRenderer;
    this.auditService = auditService;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public HospitalSalesRegisterView get(
      AuthPrincipal principal,
      LocalDate from,
      LocalDate to,
      String source,
      String paymentMode,
      String paid,
      String insurer,
      String wardId,
      String q,
      String branchId) {
    return build(
        requireContext(principal, branchId),
        from,
        to,
        source,
        paymentMode,
        paid,
        insurer,
        wardId,
        q);
  }

  @Transactional
  public HospitalSalesRegisterExport export(
      AuthPrincipal principal,
      LocalDate from,
      LocalDate to,
      String source,
      String paymentMode,
      String paid,
      String insurer,
      String wardId,
      String q,
      String branchId,
      String format) {
    String kind = HospitalPolicy.requireRegisterExportFormat(format);
    HospitalSalesRegisterView view =
        build(
            requireContext(principal, branchId),
            from,
            to,
            source,
            paymentMode,
            paid,
            insurer,
            wardId,
            q);
    HospitalPolicy.requireRegisterExportSize(view.items().size());
    List<Map<String, String>> rows = csvRows(view.items());
    byte[] body;
    String filename;
    String contentType;
    if ("pdf".equals(kind)) {
      body = pdfRenderer.render("Patient sales", COLUMNS, rows);
      filename = "patient-sales.pdf";
      contentType = MediaType.APPLICATION_PDF_VALUE;
    } else {
      body = csv(COLUMNS, rows).getBytes(StandardCharsets.UTF_8);
      filename = "patient-sales.csv";
      contentType = "text/csv";
    }
    auditService.record(
        new AuditRecordCommand(
            principal.userId(),
            principal.tenantId(),
            principal.activeBranchId(),
            HospitalPolicy.SALES_REGISTER_EXPORT_ACTION,
            AuditService.OUTCOME_SUCCESS,
            null,
            null,
            null,
            principal.sessionId(),
            "{\"format\":\"" + kind + "\",\"rows\":" + view.items().size() + "}"));
    return new HospitalSalesRegisterExport(filename, contentType, body);
  }

  private HospitalSalesRegisterView build(
      BranchContext ctx,
      LocalDate from,
      LocalDate to,
      String sourceRaw,
      String paymentRaw,
      String paidRaw,
      String insurerRaw,
      String wardRaw,
      String qRaw) {
    LocalDate[] window = HospitalPolicy.resolveRegisterWindow(from, to, Instant.now(clock));
    InvoiceSaleSource source = HospitalPolicy.parseRegisterSource(sourceRaw);
    PaymentMode paymentMode = HospitalPolicy.parseRegisterPaymentMode(paymentRaw);
    String paid = HospitalPolicy.parsePaidFilter(paidRaw);
    UUID wardId = HospitalPolicy.parseOptionalUuid(wardRaw);
    String insurer = trimToNull(insurerRaw);
    String query = trimToNull(qRaw) == null ? null : trimToNull(qRaw).toLowerCase(Locale.ROOT);
    List<SalesInvoice> completed =
        salesInvoiceRepository.findCompletedInWindow(
            ctx.tenantId(),
            List.of(ctx.branchId()),
            SalesInvoiceStatus.COMPLETED,
            HospitalPolicy.registerStart(window[0]),
            HospitalPolicy.registerEndExclusive(window[1]));
    Map<UUID, List<SalesInvoicePayment>> payments = paymentsByInvoice(ctx.tenantId(), completed);
    Map<UUID, Customer> customers = customersById(ctx.tenantId(), completed);
    Map<UUID, String> wards = wardNames(ctx);
    EnumMap<InvoiceSaleSource, long[]> tiles = new EnumMap<>(InvoiceSaleSource.class);
    for (InvoiceSaleSource tileSource : TILE_ORDER) {
      tiles.put(tileSource, new long[] {0L, 0L});
    }
    List<HospitalSalesRegisterRow> rows = new ArrayList<>();
    for (SalesInvoice invoice : completed) {
      List<SalesInvoicePayment> lines = payments.getOrDefault(invoice.getId(), List.of());
      long insurancePaise =
          lines.stream()
              .filter(line -> line.getMode() == PaymentMode.INSURANCE_TPA)
              .mapToLong(SalesInvoicePayment::getAmountPaise)
              .sum();
      InvoiceSaleSource saleSource =
          invoice.getSaleSource() == null ? InvoiceSaleSource.COUNTER : invoice.getSaleSource();
      long[] tile = tiles.get(saleSource);
      if (tile != null) {
        tile[0] += 1;
        tile[1] += invoice.getTotalPaise();
      }
      if (source != null && saleSource != source) {
        continue;
      }
      if (paymentMode != null && lines.stream().noneMatch(line -> line.getMode() == paymentMode)) {
        continue;
      }
      if (HospitalPolicy.PAID.equals(paid) && invoice.getAmountDuePaise() > 0L) {
        continue;
      }
      if (HospitalPolicy.UNPAID.equals(paid) && invoice.getAmountDuePaise() <= 0L) {
        continue;
      }
      if (wardId != null && !wardId.equals(invoice.getWardId())) {
        continue;
      }
      if (insurer != null
          && (invoice.getInsurerName() == null
              || !invoice
                  .getInsurerName()
                  .toLowerCase(Locale.ROOT)
                  .contains(insurer.toLowerCase(Locale.ROOT)))) {
        continue;
      }
      Customer customer =
          invoice.getCustomerId() == null ? null : customers.get(invoice.getCustomerId());
      String patientName = customer == null ? "" : blank(customer.getName());
      String phone = customer == null ? "" : blank(customer.getPhone());
      if (query != null && !matches(invoice, patientName, phone, query)) {
        continue;
      }
      List<String> modes = lines.stream().map(line -> line.getMode().name()).distinct().toList();
      rows.add(
          new HospitalSalesRegisterRow(
              invoice.getId(),
              invoice.getInvoiceNumber(),
              invoice.getCompletedAt(),
              saleSource.name(),
              invoice.getUhid(),
              invoice.getWardId(),
              invoice.getWardId() == null ? null : wards.get(invoice.getWardId()),
              patientName.isBlank() ? null : patientName,
              phone.isBlank() ? null : phone,
              modes,
              invoice.getInsurerName(),
              invoice.getTotalPaise(),
              invoice.getAmountPaidPaise(),
              invoice.getAmountDuePaise(),
              insurancePaise));
    }
    rows.sort(
        Comparator.comparing(
                HospitalSalesRegisterRow::completedAt,
                Comparator.nullsLast(Comparator.naturalOrder()))
            .thenComparing(
                HospitalSalesRegisterRow::invoiceNumber, Comparator.nullsLast(String::compareTo)));
    List<HospitalSalesRegisterTile> tileViews = new ArrayList<>();
    for (InvoiceSaleSource tileSource : TILE_ORDER) {
      long[] tile = tiles.get(tileSource);
      tileViews.add(new HospitalSalesRegisterTile(tileSource.name(), tile[0], tile[1]));
    }
    long revenue = 0L;
    long paidPaise = 0L;
    long unpaidPaise = 0L;
    long insurancePaise = 0L;
    for (HospitalSalesRegisterRow row : rows) {
      revenue += row.totalPaise();
      paidPaise += row.amountPaidPaise();
      unpaidPaise += row.amountDuePaise();
      insurancePaise += row.insurancePaise();
    }
    return new HospitalSalesRegisterView(
        List.copyOf(tileViews),
        new HospitalSalesRegisterTotals(
            rows.size(), revenue, paidPaise, unpaidPaise, insurancePaise),
        List.copyOf(rows));
  }

  private boolean matches(SalesInvoice invoice, String patientName, String phone, String query) {
    return contains(invoice.getInvoiceNumber(), query)
        || contains(patientName, query)
        || contains(phone, query)
        || contains(invoice.getUhid(), query);
  }

  private Map<UUID, List<SalesInvoicePayment>> paymentsByInvoice(
      UUID tenantId, List<SalesInvoice> invoices) {
    if (invoices.isEmpty()) {
      return Map.of();
    }
    List<UUID> ids = invoices.stream().map(SalesInvoice::getId).toList();
    return salesInvoicePaymentRepository
        .findAllByTenantIdAndSalesInvoiceIdIn(tenantId, ids)
        .stream()
        .collect(Collectors.groupingBy(SalesInvoicePayment::getSalesInvoiceId));
  }

  private Map<UUID, Customer> customersById(UUID tenantId, List<SalesInvoice> invoices) {
    List<UUID> ids =
        invoices.stream()
            .map(SalesInvoice::getCustomerId)
            .filter(id -> id != null)
            .distinct()
            .toList();
    if (ids.isEmpty()) {
      return Map.of();
    }
    return customerRepository.findAllByTenantIdAndIdIn(tenantId, ids).stream()
        .collect(Collectors.toMap(Customer::getId, customer -> customer));
  }

  private Map<UUID, String> wardNames(BranchContext ctx) {
    return hospitalWardRepository
        .findAllByTenantIdAndBranchIdOrderByNameAsc(ctx.tenantId(), ctx.branchId())
        .stream()
        .collect(Collectors.toMap(HospitalWard::getId, HospitalWard::getName));
  }

  private BranchContext requireContext(AuthPrincipal principal, String branchIdRaw) {
    AppUser user = requireTenantUser(principal);
    UUID branchId = requireActiveBranch(principal);
    UUID requested = HospitalPolicy.parseOptionalUuid(branchIdRaw);
    if (requested != null && !requested.equals(branchId)) {
      throw HospitalPolicy.notFound();
    }
    PlanCode plan = subscriptionService.resolvePlan(user.getTenantId());
    HospitalPolicy.assertEntitled(plan);
    Set<ModuleCode> modules = accessQueryService.effectiveModules(user);
    HospitalPolicy.requireSalesRegisterReader(
        modules.contains(ModuleCode.HOSPITAL), modules.contains(ModuleCode.REPORTING));
    loadVisibleBranch(user, branchId);
    return new BranchContext(user, user.getTenantId(), branchId);
  }

  private UUID requireActiveBranch(AuthPrincipal principal) {
    if (principal.activeBranchId() == null) {
      throw HospitalPolicy.noActiveBranch();
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
        .filter(found -> found.getTenantId() != null)
        .orElseThrow(
            () -> new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "Unauthenticated"));
  }

  private static List<Map<String, String>> csvRows(List<HospitalSalesRegisterRow> items) {
    List<Map<String, String>> rows = new ArrayList<>();
    for (HospitalSalesRegisterRow item : items) {
      Map<String, String> row = new LinkedHashMap<>();
      row.put("Invoice", blank(item.invoiceNumber()));
      row.put("Date", item.completedAt() == null ? "" : IST_TS.format(item.completedAt()));
      row.put("Source", blank(item.saleSource()));
      row.put("Patient", blank(item.patientName()));
      row.put("Phone", blank(item.phone()));
      row.put("UHID", blank(item.uhid()));
      row.put("Ward", blank(item.wardName()));
      row.put("Payment", String.join(" ", item.paymentModes()));
      row.put("Insurer", blank(item.insurerName()));
      row.put("Revenue", Long.toString(item.totalPaise()));
      row.put("Paid", Long.toString(item.amountPaidPaise()));
      row.put("Unpaid", Long.toString(item.amountDuePaise()));
      row.put("Insurance", Long.toString(item.insurancePaise()));
      rows.add(row);
    }
    return rows;
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

  private static boolean contains(String value, String query) {
    return value != null && value.toLowerCase(Locale.ROOT).contains(query);
  }

  private static String trimToNull(String value) {
    if (value == null || value.isBlank()) {
      return null;
    }
    return value.trim();
  }

  private static String blank(String value) {
    return value == null ? "" : value;
  }

  private record BranchContext(AppUser user, UUID tenantId, UUID branchId) {}
}
