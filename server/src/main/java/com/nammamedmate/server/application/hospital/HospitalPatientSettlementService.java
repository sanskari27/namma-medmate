package com.nammamedmate.server.application.hospital;

import com.nammamedmate.server.application.access.AccessQueryService;
import com.nammamedmate.server.application.audit.AuditRecordCommand;
import com.nammamedmate.server.application.audit.AuditService;
import com.nammamedmate.server.application.branch.BranchAssignmentService;
import com.nammamedmate.server.application.customercredit.CustomerCreditService;
import com.nammamedmate.server.application.subscription.SubscriptionService;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.BranchStatus;
import com.nammamedmate.server.domain.Customer;
import com.nammamedmate.server.domain.HospitalActivePatientKind;
import com.nammamedmate.server.domain.HospitalActivePatientView;
import com.nammamedmate.server.domain.HospitalAdmission;
import com.nammamedmate.server.domain.HospitalAdmissionStatus;
import com.nammamedmate.server.domain.HospitalBed;
import com.nammamedmate.server.domain.HospitalPatientSettlement;
import com.nammamedmate.server.domain.HospitalPolicy;
import com.nammamedmate.server.domain.HospitalWard;
import com.nammamedmate.server.domain.InvoiceSaleSource;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.ModuleCode;
import com.nammamedmate.server.domain.PaymentMode;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.SalesInvoice;
import com.nammamedmate.server.domain.SalesInvoiceLine;
import com.nammamedmate.server.domain.SalesInvoicePayment;
import com.nammamedmate.server.domain.SalesInvoiceStatus;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.CustomerRepository;
import com.nammamedmate.server.persistence.HospitalAdmissionRepository;
import com.nammamedmate.server.persistence.HospitalBedRepository;
import com.nammamedmate.server.persistence.HospitalPatientSettlementRepository;
import com.nammamedmate.server.persistence.HospitalWardRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.SalesInvoiceLineRepository;
import com.nammamedmate.server.persistence.SalesInvoicePaymentRepository;
import com.nammamedmate.server.persistence.SalesInvoiceRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class HospitalPatientSettlementService {

  private static final String NO_BRANCH_CODE = "NO_ACTIVE_BRANCH";
  private static final String NO_BRANCH_MESSAGE = "Select an outlet before opening wards.";
  private static final String CASUALTY_LABEL = "Casualty";
  private static final List<InvoiceSaleSource> HOSPITAL_SOURCES =
      List.of(InvoiceSaleSource.WARD, InvoiceSaleSource.EMERGENCY);

  private final AppUserRepository appUserRepository;
  private final HospitalAdmissionRepository admissionRepository;
  private final HospitalWardRepository wardRepository;
  private final HospitalBedRepository bedRepository;
  private final HospitalPatientSettlementRepository settlementRepository;
  private final SalesInvoiceRepository salesInvoiceRepository;
  private final SalesInvoiceLineRepository salesInvoiceLineRepository;
  private final SalesInvoicePaymentRepository salesInvoicePaymentRepository;
  private final CustomerRepository customerRepository;
  private final LocationRepository locationRepository;
  private final AccessQueryService accessQueryService;
  private final SubscriptionService subscriptionService;
  private final BranchAssignmentService branchAssignmentService;
  private final CustomerCreditService customerCreditService;
  private final AuditService auditService;
  private final Clock clock;

  public HospitalPatientSettlementService(
      AppUserRepository appUserRepository,
      HospitalAdmissionRepository admissionRepository,
      HospitalWardRepository wardRepository,
      HospitalBedRepository bedRepository,
      HospitalPatientSettlementRepository settlementRepository,
      SalesInvoiceRepository salesInvoiceRepository,
      SalesInvoiceLineRepository salesInvoiceLineRepository,
      SalesInvoicePaymentRepository salesInvoicePaymentRepository,
      CustomerRepository customerRepository,
      LocationRepository locationRepository,
      AccessQueryService accessQueryService,
      SubscriptionService subscriptionService,
      BranchAssignmentService branchAssignmentService,
      CustomerCreditService customerCreditService,
      AuditService auditService,
      Clock clock) {
    this.appUserRepository = appUserRepository;
    this.admissionRepository = admissionRepository;
    this.wardRepository = wardRepository;
    this.bedRepository = bedRepository;
    this.settlementRepository = settlementRepository;
    this.salesInvoiceRepository = salesInvoiceRepository;
    this.salesInvoiceLineRepository = salesInvoiceLineRepository;
    this.salesInvoicePaymentRepository = salesInvoicePaymentRepository;
    this.customerRepository = customerRepository;
    this.locationRepository = locationRepository;
    this.accessQueryService = accessQueryService;
    this.subscriptionService = subscriptionService;
    this.branchAssignmentService = branchAssignmentService;
    this.customerCreditService = customerCreditService;
    this.auditService = auditService;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public HospitalActivePatientListView list(
      AuthPrincipal principal, HospitalActivePatientView view, String query) {
    BranchContext ctx = requireRead(principal);
    Map<UUID, HospitalWard> wards = wardIndex(ctx);
    Map<UUID, Customer> customers = new HashMap<>();
    List<HospitalActivePatientRow> rows = new ArrayList<>();
    if (view == HospitalActivePatientView.ALL) {
      for (HospitalAdmission admission :
          admissionRepository.findAllByTenantIdAndBranchIdAndStatusOrderByAdmittedAtDesc(
              ctx.tenantId(), ctx.branchId(), HospitalAdmissionStatus.ACTIVE)) {
        rows.add(
            toRow(
                ctx,
                admission,
                wards.get(admission.getWardId()),
                invoicesForAdmission(ctx, admission.getId())));
      }
    }
    Map<UUID, HospitalActivePatientRow> byAdmission = new HashMap<>();
    for (HospitalActivePatientRow row : rows) {
      if (row.admissionId() != null) {
        byAdmission.put(row.admissionId(), row);
      }
    }
    List<SalesInvoice> unpaid =
        salesInvoiceRepository
            .findAllByTenantIdAndBranchIdAndStatusAndAmountDuePaiseGreaterThanAndSaleSourceIn(
                ctx.tenantId(), ctx.branchId(), SalesInvoiceStatus.COMPLETED, 0L, HOSPITAL_SOURCES);
    Map<UUID, List<SalesInvoice>> unpaidByAdmission = new HashMap<>();
    Map<String, List<SalesInvoice>> unpaidCasualty = new HashMap<>();
    for (SalesInvoice invoice : unpaid) {
      if (invoice.getAdmissionId() != null) {
        unpaidByAdmission
            .computeIfAbsent(invoice.getAdmissionId(), ignored -> new ArrayList<>())
            .add(invoice);
      } else if (invoice.getSaleSource() == InvoiceSaleSource.EMERGENCY
          && invoice.getUhid() != null) {
        unpaidCasualty
            .computeIfAbsent(
                invoice.getUhid().toLowerCase(Locale.ROOT), ignored -> new ArrayList<>())
            .add(invoice);
      }
    }
    if (view == HospitalActivePatientView.UNSETTLED) {
      rows.clear();
      for (Map.Entry<UUID, List<SalesInvoice>> entry : unpaidByAdmission.entrySet()) {
        HospitalAdmission admission =
            admissionRepository
                .findByIdAndTenantIdAndBranchId(entry.getKey(), ctx.tenantId(), ctx.branchId())
                .filter(row -> row.getStatus() == HospitalAdmissionStatus.ACTIVE)
                .orElse(null);
        if (admission == null) {
          continue;
        }
        rows.add(
            toRow(
                ctx,
                admission,
                wards.get(admission.getWardId()),
                invoicesForAdmission(ctx, admission.getId())));
      }
    } else {
      for (Map.Entry<UUID, List<SalesInvoice>> entry : unpaidByAdmission.entrySet()) {
        if (byAdmission.containsKey(entry.getKey())) {
          continue;
        }
        HospitalAdmission admission =
            admissionRepository
                .findByIdAndTenantIdAndBranchId(entry.getKey(), ctx.tenantId(), ctx.branchId())
                .filter(row -> row.getStatus() == HospitalAdmissionStatus.ACTIVE)
                .orElse(null);
        if (admission == null) {
          continue;
        }
        rows.add(
            toRow(
                ctx,
                admission,
                wards.get(admission.getWardId()),
                invoicesForAdmission(ctx, admission.getId())));
      }
    }
    for (Map.Entry<String, List<SalesInvoice>> entry : unpaidCasualty.entrySet()) {
      rows.add(casualtyRow(ctx, entry.getValue(), customers));
    }
    String needle = query == null ? "" : query.trim().toLowerCase(Locale.ROOT);
    if (!needle.isEmpty()) {
      rows =
          rows.stream()
              .filter(
                  row ->
                      contains(row.uhid(), needle)
                          || contains(row.patientName(), needle)
                          || contains(row.wardName(), needle)
                          || contains(row.locationLabel(), needle))
              .toList();
    }
    rows =
        rows.stream()
            .sorted(
                Comparator.comparing(
                        HospitalActivePatientRow::patientName, String.CASE_INSENSITIVE_ORDER)
                    .thenComparing(HospitalActivePatientRow::uhid, String.CASE_INSENSITIVE_ORDER))
            .toList();
    return new HospitalActivePatientListView(rows);
  }

  @Transactional(readOnly = true)
  public HospitalActivePatientDetailView getAdmission(AuthPrincipal principal, UUID admissionId) {
    BranchContext ctx = requireRead(principal);
    HospitalAdmission admission = requireAdmission(ctx, admissionId);
    return toDetail(ctx, admission, invoicesForAdmission(ctx, admission.getId()));
  }

  @Transactional(readOnly = true)
  public HospitalActivePatientDetailView getCasualty(AuthPrincipal principal, String uhid) {
    BranchContext ctx = requireRead(principal);
    String normalized = requireUhid(uhid);
    List<SalesInvoice> invoices = casualtyInvoices(ctx, normalized);
    if (invoices.isEmpty()) {
      throw HospitalPolicy.notFound();
    }
    return casualtyDetail(ctx, invoices);
  }

  @Transactional
  public HospitalActivePatientDetailView settleAdmission(
      AuthPrincipal principal, UUID admissionId, HospitalPatientSettleCommand command) {
    BranchContext ctx = requireRead(principal);
    HospitalActivePatientDetailView replay = replayIfPresent(ctx, admissionId, null, command);
    if (replay != null) {
      return replay;
    }
    HospitalAdmission admission =
        admissionRepository
            .lockByIdAndTenantIdAndBranchId(admissionId, ctx.tenantId(), ctx.branchId())
            .orElseThrow(HospitalPolicy::notFound);
    HospitalPolicy.assertAdmissionVersion(admission.getVersion(), command.expectedVersion());
    return settleLocked(principal, ctx, admission, admission.getUhid(), command, false);
  }

  @Transactional
  public HospitalActivePatientDetailView settleCasualty(
      AuthPrincipal principal, HospitalPatientSettleCommand command) {
    BranchContext ctx = requireRead(principal);
    String uhid = requireUhid(command.uhid());
    HospitalActivePatientDetailView replay = replayIfPresent(ctx, null, uhid, command);
    if (replay != null) {
      return replay;
    }
    return settleLocked(principal, ctx, null, uhid, command, false);
  }

  @Transactional
  public HospitalActivePatientDetailView discharge(
      AuthPrincipal principal, UUID admissionId, HospitalPatientSettleCommand command) {
    BranchContext ctx = requireWardWriter(principal);
    HospitalAdmission admission =
        admissionRepository
            .lockByIdAndTenantIdAndBranchId(admissionId, ctx.tenantId(), ctx.branchId())
            .orElseThrow(HospitalPolicy::notFound);
    if (admission.getStatus() == HospitalAdmissionStatus.DISCHARGED) {
      throw HospitalPolicy.admissionStale();
    }
    HospitalPolicy.assertAdmissionVersion(admission.getVersion(), command.expectedVersion());
    boolean settleIncluded = command.paymentMode() != null && !command.paymentMode().isBlank();
    List<SalesInvoice> invoices = lockUnpaid(ctx, admission.getId(), admission.getUhid(), false);
    long unpaid = unpaidPaise(invoices);
    HospitalPolicy.assertNoOutstanding(unpaid, settleIncluded);
    if (settleIncluded) {
      settleLocked(principal, ctx, admission, admission.getUhid(), command, true);
      admission =
          admissionRepository
              .lockByIdAndTenantIdAndBranchId(admissionId, ctx.tenantId(), ctx.branchId())
              .orElseThrow(HospitalPolicy::notFound);
    }
    Instant now = clock.instant();
    int freed =
        bedRepository.freeIfOccupied(admission.getBedId(), ctx.tenantId(), ctx.branchId(), now);
    if (freed == 0) {
      throw HospitalPolicy.admissionStale();
    }
    admission.setStatus(HospitalAdmissionStatus.DISCHARGED);
    admission.setDischargedAt(now);
    admission.setVersion(admission.getVersion() + 1);
    admission.setUpdatedAt(now);
    admissionRepository.saveAndFlush(admission);
    audit(ctx, "HOSPITAL_ADMISSION_DISCHARGE", "{\"admissionId\":\"" + admission.getId() + "\"}");
    return toDetail(ctx, admission, invoicesForAdmission(ctx, admission.getId()));
  }

  private HospitalActivePatientDetailView replayIfPresent(
      BranchContext ctx, UUID admissionId, String uhid, HospitalPatientSettleCommand command) {
    if (command == null || command.idempotencyKey() == null || command.idempotencyKey().isBlank()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
    return settlementRepository
        .findByTenantIdAndIdempotencyKey(ctx.tenantId(), command.idempotencyKey().trim())
        .map(
            row -> {
              if (uhid != null && !row.getUhid().equalsIgnoreCase(uhid)) {
                throw new ApiException(
                    HttpStatus.CONFLICT,
                    "IDEMPOTENCY_CONFLICT",
                    "Idempotency key was already used with different payload");
              }
              if (admissionId != null && !admissionId.equals(row.getAdmissionId())) {
                throw new ApiException(
                    HttpStatus.CONFLICT,
                    "IDEMPOTENCY_CONFLICT",
                    "Idempotency key was already used with different payload");
              }
              if (admissionId != null) {
                HospitalAdmission admission = requireAdmission(ctx, admissionId);
                return toDetail(ctx, admission, invoicesForAdmission(ctx, admission.getId()));
              }
              return casualtyDetail(ctx, casualtyInvoices(ctx, row.getUhid()));
            })
        .orElse(null);
  }

  private HospitalActivePatientDetailView settleLocked(
      AuthPrincipal principal,
      BranchContext ctx,
      HospitalAdmission admission,
      String uhid,
      HospitalPatientSettleCommand command,
      boolean nested) {
    if (command == null || command.idempotencyKey() == null || command.idempotencyKey().isBlank()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
    String key = command.idempotencyKey().trim();
    PaymentMode mode = HospitalPolicy.requireSettleMode(command.paymentMode());
    InvoiceHospitalSalePolicyAssertTpa(mode, command.insurerName(), command.policyNumber());
    List<SalesInvoice> unpaid =
        lockUnpaid(ctx, admission == null ? null : admission.getId(), uhid, admission == null);
    long unpaidPaise = unpaidPaise(unpaid);
    HospitalPolicy.assertHasUnpaid(unpaidPaise);
    Instant now = clock.instant();
    String insurer = trimToNull(command.insurerName());
    String policy = trimToNull(command.policyNumber());
    for (SalesInvoice invoice : unpaid) {
      long due = invoice.getAmountDuePaise();
      int nextOrder =
          salesInvoicePaymentRepository
              .findAllBySalesInvoiceIdAndTenantIdAndBranchIdOrderBySortOrderAsc(
                  invoice.getId(), ctx.tenantId(), ctx.branchId())
              .size();
      SalesInvoicePayment payment = new SalesInvoicePayment();
      payment.setId(UUID.randomUUID());
      payment.setTenantId(ctx.tenantId());
      payment.setBranchId(ctx.branchId());
      payment.setSalesInvoiceId(invoice.getId());
      payment.setMode(mode);
      payment.setAmountPaise(due);
      payment.setSortOrder(nextOrder);
      payment.setCreatedAt(now);
      salesInvoicePaymentRepository.save(payment);
      invoice.setAmountPaidPaise(invoice.getAmountPaidPaise() + due);
      invoice.setAmountDuePaise(0L);
      if (mode == PaymentMode.INSURANCE_TPA) {
        invoice.setInsurerName(insurer);
        invoice.setPolicyNumber(policy);
      }
      invoice.setVersion(invoice.getVersion() + 1);
      invoice.setUpdatedAt(now);
      salesInvoiceRepository.save(invoice);
      if (invoice.getCustomerId() != null) {
        customerCreditService.settleAttributed(
            principal,
            ctx.tenantId(),
            invoice.getCustomerId(),
            due,
            invoice.getId(),
            mode.name(),
            key + ":" + invoice.getId());
      }
    }
    HospitalPatientSettlement settlement = new HospitalPatientSettlement();
    settlement.setId(UUID.randomUUID());
    settlement.setTenantId(ctx.tenantId());
    settlement.setBranchId(ctx.branchId());
    settlement.setAdmissionId(admission == null ? null : admission.getId());
    settlement.setUhid(uhid);
    settlement.setPaymentMode(mode);
    settlement.setAmountPaise(unpaidPaise);
    settlement.setInsurerName(insurer);
    settlement.setPolicyNumber(policy);
    settlement.setIdempotencyKey(key);
    settlement.setCreatedBy(ctx.user().getId());
    settlement.setCreatedAt(now);
    settlementRepository.saveAndFlush(settlement);
    if (admission != null && !nested) {
      admission.setVersion(admission.getVersion() + 1);
      admission.setUpdatedAt(now);
      admissionRepository.save(admission);
    }
    audit(
        ctx,
        "HOSPITAL_PATIENT_SETTLE",
        "{\"uhid\":\"" + uhid + "\",\"amountPaise\":" + unpaidPaise + "}");
    if (admission != null) {
      return toDetail(ctx, admission, invoicesForAdmission(ctx, admission.getId()));
    }
    return casualtyDetail(ctx, casualtyInvoices(ctx, uhid));
  }

  private void InvoiceHospitalSalePolicyAssertTpa(
      PaymentMode mode, String insurerName, String policyNumber) {
    if (mode != PaymentMode.INSURANCE_TPA) {
      return;
    }
    HospitalPolicy.requireTpaFields(trimToNull(insurerName), trimToNull(policyNumber));
  }

  private List<SalesInvoice> lockUnpaid(
      BranchContext ctx, UUID admissionId, String uhid, boolean casualtyOnly) {
    List<SalesInvoice> candidates;
    if (casualtyOnly) {
      candidates =
          salesInvoiceRepository
              .findAllByTenantIdAndBranchIdAndUhidIgnoreCaseAndSaleSourceAndAdmissionIdIsNullAndStatusOrderByCompletedAtAsc(
                  ctx.tenantId(),
                  ctx.branchId(),
                  uhid,
                  InvoiceSaleSource.EMERGENCY,
                  SalesInvoiceStatus.COMPLETED);
    } else {
      candidates =
          salesInvoiceRepository
              .findAllByTenantIdAndBranchIdAndAdmissionIdAndStatusOrderByCompletedAtAsc(
                  ctx.tenantId(), ctx.branchId(), admissionId, SalesInvoiceStatus.COMPLETED);
    }
    return candidates.stream()
        .filter(invoice -> invoice.getAmountDuePaise() > 0L)
        .sorted(Comparator.comparing(SalesInvoice::getId))
        .map(
            invoice ->
                salesInvoiceRepository
                    .lockByIdAndTenantIdAndBranchId(invoice.getId(), ctx.tenantId(), ctx.branchId())
                    .orElseThrow(HospitalPolicy::notFound))
        .filter(invoice -> invoice.getAmountDuePaise() > 0L)
        .toList();
  }

  private List<SalesInvoice> invoicesForAdmission(BranchContext ctx, UUID admissionId) {
    return salesInvoiceRepository
        .findAllByTenantIdAndBranchIdAndAdmissionIdAndStatusOrderByCompletedAtAsc(
            ctx.tenantId(), ctx.branchId(), admissionId, SalesInvoiceStatus.COMPLETED);
  }

  private List<SalesInvoice> casualtyInvoices(BranchContext ctx, String uhid) {
    return salesInvoiceRepository
        .findAllByTenantIdAndBranchIdAndUhidIgnoreCaseAndSaleSourceAndAdmissionIdIsNullAndStatusOrderByCompletedAtAsc(
            ctx.tenantId(),
            ctx.branchId(),
            uhid,
            InvoiceSaleSource.EMERGENCY,
            SalesInvoiceStatus.COMPLETED);
  }

  private HospitalActivePatientRow toRow(
      BranchContext ctx,
      HospitalAdmission admission,
      HospitalWard ward,
      List<SalesInvoice> invoices) {
    Totals totals = totals(invoices);
    String wardName = ward == null ? null : ward.getName();
    return new HospitalActivePatientRow(
        HospitalActivePatientKind.ADMISSION,
        admission.getId(),
        admission.getUhid(),
        admission.getPatientName(),
        wardName,
        wardName,
        totals.unpaidPaise(),
        totals.settledPaise(),
        totals.billCount(),
        admission.getStatus(),
        admission.getVersion());
  }

  private HospitalActivePatientRow casualtyRow(
      BranchContext ctx, List<SalesInvoice> invoices, Map<UUID, Customer> customers) {
    Totals totals = totals(invoices);
    SalesInvoice first = invoices.get(0);
    return new HospitalActivePatientRow(
        HospitalActivePatientKind.CASUALTY,
        null,
        first.getUhid(),
        casualtyName(ctx, invoices, customers),
        null,
        CASUALTY_LABEL,
        totals.unpaidPaise(),
        totals.settledPaise(),
        totals.billCount(),
        null,
        0L);
  }

  private HospitalActivePatientDetailView toDetail(
      BranchContext ctx, HospitalAdmission admission, List<SalesInvoice> invoices) {
    HospitalWard ward =
        wardRepository
            .findByIdAndTenantIdAndBranchId(admission.getWardId(), ctx.tenantId(), ctx.branchId())
            .orElse(null);
    HospitalBed bed =
        bedRepository
            .findByIdAndTenantIdAndBranchId(admission.getBedId(), ctx.tenantId(), ctx.branchId())
            .orElse(null);
    Totals totals = totals(invoices);
    return new HospitalActivePatientDetailView(
        HospitalActivePatientKind.ADMISSION,
        admission.getId(),
        admission.getUhid(),
        admission.getPatientName(),
        ward == null ? null : ward.getName(),
        bed == null ? null : bed.getLabel(),
        ward == null ? null : ward.getName(),
        admission.getStatus(),
        admission.getAdmittedAt(),
        admission.getDischargedAt(),
        admission.getVersion(),
        totals.unpaidPaise(),
        totals.settledPaise(),
        totals.billCount(),
        invoiceViews(ctx, invoices));
  }

  private HospitalActivePatientDetailView casualtyDetail(
      BranchContext ctx, List<SalesInvoice> invoices) {
    Totals totals = totals(invoices);
    SalesInvoice first = invoices.get(0);
    return new HospitalActivePatientDetailView(
        HospitalActivePatientKind.CASUALTY,
        null,
        first.getUhid(),
        casualtyName(ctx, invoices, new HashMap<>()),
        null,
        null,
        CASUALTY_LABEL,
        null,
        null,
        null,
        0L,
        totals.unpaidPaise(),
        totals.settledPaise(),
        totals.billCount(),
        invoiceViews(ctx, invoices));
  }

  private List<HospitalActivePatientInvoiceView> invoiceViews(
      BranchContext ctx, List<SalesInvoice> invoices) {
    if (invoices.isEmpty()) {
      return List.of();
    }
    List<UUID> ids = invoices.stream().map(SalesInvoice::getId).toList();
    Map<UUID, List<SalesInvoiceLine>> lines =
        salesInvoiceLineRepository
            .findAllByTenantIdAndSalesInvoiceIdIn(ctx.tenantId(), ids)
            .stream()
            .collect(Collectors.groupingBy(SalesInvoiceLine::getSalesInvoiceId));
    Map<UUID, List<SalesInvoicePayment>> payments =
        salesInvoicePaymentRepository
            .findAllByTenantIdAndSalesInvoiceIdIn(ctx.tenantId(), ids)
            .stream()
            .collect(Collectors.groupingBy(SalesInvoicePayment::getSalesInvoiceId));
    return invoices.stream()
        .map(
            invoice ->
                new HospitalActivePatientInvoiceView(
                    invoice.getId(),
                    invoice.getInvoiceNumber(),
                    invoice.getCompletedAt(),
                    invoice.getSaleSource() == null ? null : invoice.getSaleSource().name(),
                    lines.getOrDefault(invoice.getId(), List.of()).size(),
                    paymentLabel(
                        payments.getOrDefault(invoice.getId(), List.of()),
                        invoice.getAmountDuePaise()),
                    invoice.getStatus().name(),
                    invoice.getTotalPaise(),
                    invoice.getAmountDuePaise(),
                    invoice.getAmountPaidPaise(),
                    invoice.getInsurerName(),
                    invoice.getPolicyNumber()))
        .toList();
  }

  private String casualtyName(
      BranchContext ctx, List<SalesInvoice> invoices, Map<UUID, Customer> customers) {
    for (SalesInvoice invoice : invoices) {
      if (invoice.getCustomerId() == null) {
        continue;
      }
      Customer customer =
          customers.computeIfAbsent(
              invoice.getCustomerId(),
              id ->
                  customerRepository
                      .findByIdAndTenantIdAndDeletedAtIsNull(id, ctx.tenantId())
                      .orElse(null));
      if (customer != null && customer.getName() != null && !customer.getName().isBlank()) {
        return customer.getName();
      }
    }
    return invoices.get(0).getUhid();
  }

  private Map<UUID, HospitalWard> wardIndex(BranchContext ctx) {
    return wardRepository
        .findAllByTenantIdAndBranchIdOrderByNameAsc(ctx.tenantId(), ctx.branchId())
        .stream()
        .collect(Collectors.toMap(HospitalWard::getId, Function.identity()));
  }

  private HospitalAdmission requireAdmission(BranchContext ctx, UUID admissionId) {
    return admissionRepository
        .findByIdAndTenantIdAndBranchId(admissionId, ctx.tenantId(), ctx.branchId())
        .orElseThrow(HospitalPolicy::notFound);
  }

  private static Totals totals(List<SalesInvoice> invoices) {
    long unpaid = 0L;
    long settled = 0L;
    for (SalesInvoice invoice : invoices) {
      unpaid += invoice.getAmountDuePaise();
      settled += Math.max(0L, invoice.getTotalPaise() - invoice.getAmountDuePaise());
    }
    return new Totals(unpaid, settled, invoices.size());
  }

  private static long unpaidPaise(List<SalesInvoice> invoices) {
    return invoices.stream().mapToLong(SalesInvoice::getAmountDuePaise).sum();
  }

  private static String paymentLabel(List<SalesInvoicePayment> payments, long amountDuePaise) {
    boolean tpa =
        payments.stream().anyMatch(payment -> payment.getMode() == PaymentMode.INSURANCE_TPA);
    if (tpa) {
      return "Insurance/TPA";
    }
    if (amountDuePaise > 0L) {
      return "Khata";
    }
    PaymentMode last = null;
    int order = -1;
    for (SalesInvoicePayment payment : payments) {
      if (payment.getMode() == PaymentMode.CREDIT) {
        continue;
      }
      if (payment.getSortOrder() >= order) {
        order = payment.getSortOrder();
        last = payment.getMode();
      }
    }
    if (last == PaymentMode.CASH) {
      return "Cash";
    }
    if (last == PaymentMode.UPI) {
      return "UPI";
    }
    if (last == PaymentMode.CARD) {
      return "Card";
    }
    if (last == PaymentMode.BANK_TRANSFER) {
      return "Bank";
    }
    return last == null ? "Khata" : last.name();
  }

  private static boolean contains(String value, String needle) {
    return value != null && value.toLowerCase(Locale.ROOT).contains(needle);
  }

  private static String requireUhid(String uhid) {
    String trimmed = trimToNull(uhid);
    if (trimmed == null) {
      throw HospitalPolicy.notFound();
    }
    return trimmed;
  }

  private static String trimToNull(String value) {
    if (value == null || value.isBlank()) {
      return null;
    }
    return value.trim();
  }

  private BranchContext requireRead(AuthPrincipal principal) {
    AppUser user = requireTenantUser(principal);
    UUID branchId = requireActiveBranch(principal);
    PlanCode plan = subscriptionService.resolvePlan(user.getTenantId());
    HospitalPolicy.assertEntitled(plan);
    Set<ModuleCode> modules = accessQueryService.effectiveModules(user);
    HospitalPolicy.requireHospitalModule(modules.contains(ModuleCode.HOSPITAL));
    loadVisibleBranch(user, branchId);
    return new BranchContext(user, user.getTenantId(), branchId);
  }

  private BranchContext requireWardWriter(AuthPrincipal principal) {
    AppUser user = requireTenantUser(principal);
    UUID branchId = requireActiveBranch(principal);
    PlanCode plan = subscriptionService.resolvePlan(user.getTenantId());
    HospitalPolicy.assertEntitled(plan);
    boolean hasHospital = accessQueryService.effectiveModules(user).contains(ModuleCode.HOSPITAL);
    boolean pharmacist =
        accessQueryService.hasAssignedRoleCode(user, HospitalPolicy.PHARMACIST_CODE);
    HospitalPolicy.requireWardWriter(user.getRole(), pharmacist, hasHospital);
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

  private void audit(BranchContext ctx, String action, String contextJson) {
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
            contextJson));
  }

  private record BranchContext(AppUser user, UUID tenantId, UUID branchId) {}

  private record Totals(long unpaidPaise, long settledPaise, int billCount) {}
}
