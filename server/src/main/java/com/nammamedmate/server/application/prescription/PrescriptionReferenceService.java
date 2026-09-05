package com.nammamedmate.server.application.prescription;

import com.nammamedmate.server.application.access.AccessQueryService;
import com.nammamedmate.server.application.audit.AuditRecordCommand;
import com.nammamedmate.server.application.audit.AuditService;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.BranchStatus;
import com.nammamedmate.server.domain.Customer;
import com.nammamedmate.server.domain.InvoicePrescriptionPolicy;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.ModuleCode;
import com.nammamedmate.server.domain.PrescriptionReference;
import com.nammamedmate.server.domain.PrescriptionReferenceArchiveReason;
import com.nammamedmate.server.domain.PrescriptionReferencePolicy;
import com.nammamedmate.server.domain.PrescriptionReferenceStatus;
import com.nammamedmate.server.domain.SalesInvoiceStatus;
import com.nammamedmate.server.domain.SalesPrescriptionFulfillment;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.CustomerRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.PrescriptionReferenceRepository;
import com.nammamedmate.server.persistence.SalesInvoiceRepository;
import com.nammamedmate.server.persistence.SalesPrescriptionFulfillmentRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PrescriptionReferenceService {

  public static final String ARCHIVE_ACTION = "PRESCRIPTION_REFERENCE_ARCHIVE";

  private final PrescriptionReferenceRepository referenceRepository;
  private final SalesPrescriptionFulfillmentRepository fulfillmentRepository;
  private final SalesInvoiceRepository salesInvoiceRepository;
  private final CustomerRepository customerRepository;
  private final LocationRepository locationRepository;
  private final AppUserRepository appUserRepository;
  private final AccessQueryService accessQueryService;
  private final AuditService auditService;
  private final Clock clock;

  public PrescriptionReferenceService(
      PrescriptionReferenceRepository referenceRepository,
      SalesPrescriptionFulfillmentRepository fulfillmentRepository,
      SalesInvoiceRepository salesInvoiceRepository,
      CustomerRepository customerRepository,
      LocationRepository locationRepository,
      AppUserRepository appUserRepository,
      AccessQueryService accessQueryService,
      AuditService auditService,
      Clock clock) {
    this.referenceRepository = referenceRepository;
    this.fulfillmentRepository = fulfillmentRepository;
    this.salesInvoiceRepository = salesInvoiceRepository;
    this.customerRepository = customerRepository;
    this.locationRepository = locationRepository;
    this.appUserRepository = appUserRepository;
    this.accessQueryService = accessQueryService;
    this.auditService = auditService;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public PrescriptionReferenceListResult list(
      AuthPrincipal principal, PrescriptionReferenceStatus status) {
    UUID tenantId = requireViewer(principal);
    List<PrescriptionReference> rows =
        status == null
            ? referenceRepository.findByTenantIdOrderByIssuedAtDesc(tenantId)
            : referenceRepository.findByTenantIdAndStatusOrderByIssuedAtDesc(tenantId, status);
    return new PrescriptionReferenceListResult(
        rows.stream().map(row -> toView(row, false)).toList());
  }

  @Transactional(readOnly = true)
  public PrescriptionReferenceView get(AuthPrincipal principal, UUID id) {
    UUID tenantId = requireViewer(principal);
    PrescriptionReference row =
        referenceRepository
            .findByIdAndTenantId(id, tenantId)
            .orElseThrow(PrescriptionReferencePolicy::notFound);
    return toView(row, true);
  }

  @Transactional
  public PrescriptionReferenceView archive(
      AuthPrincipal principal, UUID id, Integer expectedVersion) {
    UUID tenantId = requireViewer(principal);
    PrescriptionReference row =
        referenceRepository
            .lockByIdAndTenantId(id, tenantId)
            .orElseThrow(PrescriptionReferencePolicy::notFound);
    if (row.getStatus() == PrescriptionReferenceStatus.ARCHIVED) {
      return toView(row, true);
    }
    PrescriptionReferencePolicy.assertVersion(row.getVersion(), expectedVersion);
    FillState fill = fillState(tenantId, row.getPrescriptionReference());
    Instant now = clock.instant();
    PrescriptionReferenceArchiveReason reason =
        PrescriptionReferencePolicy.archiveReason(
            now, row.getExpiresAt(), fill.hasFills(), fill.remaining());
    applyArchive(row, reason, now, principal);
    return toView(row, true);
  }

  @Transactional
  public void rejectReactivation(AuthPrincipal principal, UUID id) {
    UUID tenantId = requireViewer(principal);
    referenceRepository
        .findByIdAndTenantId(id, tenantId)
        .orElseThrow(PrescriptionReferencePolicy::notFound);
    PrescriptionReferencePolicy.assertCannotReactivate();
  }

  @Transactional(readOnly = true)
  public void assertCanManage(AuthPrincipal principal) {
    requireViewer(principal);
  }

  @Transactional(readOnly = true)
  public void assertSelectable(UUID tenantId, String reference) {
    if (tenantId == null || reference == null || reference.isBlank()) {
      return;
    }
    referenceRepository
        .findByTenantIdAndPrescriptionReference(tenantId, reference.trim())
        .ifPresent(row -> PrescriptionReferencePolicy.assertSelectable(row.getStatus()));
  }

  @Transactional
  public void recordFromCompletedSale(
      AuthPrincipal principal,
      UUID tenantId,
      UUID branchId,
      UUID customerId,
      UUID doctorId,
      String reference,
      UUID invoiceId) {
    if (tenantId == null || reference == null || reference.isBlank() || customerId == null) {
      return;
    }
    String ref = reference.trim();
    Instant now = clock.instant();
    PrescriptionReference row =
        referenceRepository.lockByTenantIdAndPrescriptionReference(tenantId, ref).orElse(null);
    if (row == null) {
      row = new PrescriptionReference();
      row.setId(UUID.randomUUID());
      row.setTenantId(tenantId);
      row.setBranchId(branchId);
      row.setCustomerId(customerId);
      row.setDoctorId(doctorId);
      row.setPrescriptionReference(ref);
      row.setIssuedAt(now);
      row.setExpiresAt(PrescriptionReferencePolicy.expiresAt(now));
      row.setStatus(PrescriptionReferenceStatus.ACTIVE);
      row.setFirstInvoiceId(invoiceId);
      row.setVersion(0);
      row.setCreatedAt(now);
      row.setUpdatedAt(now);
      referenceRepository.save(row);
    }
    if (row.getStatus() == PrescriptionReferenceStatus.ARCHIVED) {
      return;
    }
    FillState fill = fillState(tenantId, ref);
    if (PrescriptionReferencePolicy.fullyFulfilled(fill.hasFills(), fill.remaining())) {
      applyArchive(row, PrescriptionReferenceArchiveReason.FULFILLED, now, principal);
    }
  }

  @Transactional
  public boolean archiveDue(UUID tenantId, UUID id, AuthPrincipal actor) {
    PrescriptionReference row = referenceRepository.lockByIdAndTenantId(id, tenantId).orElse(null);
    if (row == null || row.getStatus() == PrescriptionReferenceStatus.ARCHIVED) {
      return false;
    }
    Instant now = clock.instant();
    FillState fill = fillState(tenantId, row.getPrescriptionReference());
    if (!PrescriptionReferencePolicy.eligibleToArchive(
        now, row.getExpiresAt(), fill.hasFills(), fill.remaining())) {
      return false;
    }
    PrescriptionReferenceArchiveReason reason =
        PrescriptionReferencePolicy.archiveReason(
            now, row.getExpiresAt(), fill.hasFills(), fill.remaining());
    applyArchive(row, reason, now, actor);
    return true;
  }

  private void applyArchive(
      PrescriptionReference row,
      PrescriptionReferenceArchiveReason reason,
      Instant now,
      AuthPrincipal actor) {
    row.setStatus(PrescriptionReferenceStatus.ARCHIVED);
    row.setArchiveReason(reason);
    row.setArchivedAt(now);
    row.setVersion(row.getVersion() + 1);
    row.setUpdatedAt(now);
    referenceRepository.save(row);
    auditService.record(
        new AuditRecordCommand(
            actor == null ? null : actor.userId(),
            row.getTenantId(),
            row.getBranchId(),
            ARCHIVE_ACTION,
            AuditService.OUTCOME_SUCCESS,
            null,
            null,
            null,
            actor == null ? null : actor.sessionId(),
            "{\"id\":\""
                + row.getId()
                + "\",\"reason\":\""
                + reason.name()
                + "\",\"reference\":\""
                + row.getPrescriptionReference()
                + "\"}"));
  }

  private FillState fillState(UUID tenantId, String reference) {
    List<SalesPrescriptionFulfillment> rows =
        fulfillmentRepository.findAllByTenantIdAndPrescriptionReference(tenantId, reference);
    BigDecimal leftover = BigDecimal.ZERO;
    for (SalesPrescriptionFulfillment row : rows) {
      leftover =
          leftover.add(
              InvoicePrescriptionPolicy.remaining(
                  row.getPrescribedQuantity(), row.getFulfilledQuantity()));
    }
    return new FillState(!rows.isEmpty(), leftover);
  }

  private PrescriptionReferenceView toView(PrescriptionReference row, boolean withInvoices) {
    String customerName =
        customerRepository
            .findByIdAndTenantId(row.getCustomerId(), row.getTenantId())
            .map(Customer::getName)
            .orElse("");
    String branchName =
        locationRepository
            .findByIdAndTenantIdAndDeletedAtIsNull(row.getBranchId(), row.getTenantId())
            .map(Location::getName)
            .orElse("");
    List<PrescriptionReferenceView.SourceInvoice> invoices =
        withInvoices
            ? salesInvoiceRepository
                .findByTenantIdAndPrescriptionReferenceAndStatusOrderByCompletedAtAsc(
                    row.getTenantId(), row.getPrescriptionReference(), SalesInvoiceStatus.COMPLETED)
                .stream()
                .map(
                    invoice ->
                        new PrescriptionReferenceView.SourceInvoice(
                            invoice.getId(),
                            invoice.getInvoiceNumber(),
                            invoice.getBranchId(),
                            invoice.getCompletedAt(),
                            invoice.getTotalPaise()))
                .toList()
            : List.of();
    return new PrescriptionReferenceView(
        row.getId(),
        row.getTenantId(),
        row.getBranchId(),
        branchName,
        row.getCustomerId(),
        customerName,
        row.getDoctorId(),
        row.getPrescriptionReference(),
        row.getIssuedAt(),
        row.getExpiresAt(),
        row.getStatus(),
        row.getArchiveReason(),
        row.getArchivedAt(),
        row.getFirstInvoiceId(),
        row.getVersion(),
        invoices);
  }

  private UUID requireViewer(AuthPrincipal principal) {
    if (principal == null || principal.tenantId() == null) {
      throw PrescriptionReferencePolicy.forbidden();
    }
    if (principal.role() != AppUserRole.pharmacy_owner
        && principal.role() != AppUserRole.pharmacy_staff) {
      throw PrescriptionReferencePolicy.forbidden();
    }
    UUID branchId = principal.activeBranchId();
    if (branchId == null) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          "NO_ACTIVE_BRANCH",
          "Select an outlet before opening the Rx file.");
    }
    Location branch =
        locationRepository
            .findByIdAndTenantIdAndDeletedAtIsNull(branchId, principal.tenantId())
            .orElseThrow(PrescriptionReferencePolicy::notFound);
    if (branch.getStatus() != BranchStatus.ACTIVE) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY, "BRANCH_INACTIVE", "Outlet is not active.");
    }
    AppUser user =
        appUserRepository
            .findById(principal.userId())
            .filter(row -> row.getDeletedAt() == null)
            .orElseThrow(PrescriptionReferencePolicy::forbidden);
    boolean pharmacist = accessQueryService.hasAssignedRoleCode(user, "pharmacist");
    if (principal.role() != AppUserRole.pharmacy_owner && !pharmacist) {
      throw PrescriptionReferencePolicy.forbidden();
    }
    Set<ModuleCode> modules = accessQueryService.effectiveModules(user);
    if (!modules.contains(ModuleCode.SALES) && !modules.contains(ModuleCode.COMPLIANCE)) {
      throw PrescriptionReferencePolicy.forbidden();
    }
    return principal.tenantId();
  }

  private record FillState(boolean hasFills, BigDecimal remaining) {}
}
