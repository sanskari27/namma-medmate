package com.nammamedmate.server.application.compliance;

import com.nammamedmate.server.application.access.AccessQueryService;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.ControlledSalePolicy;
import com.nammamedmate.server.domain.ControlledSaleRegister;
import com.nammamedmate.server.domain.ScheduleClassification;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.ControlledSaleRegisterRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ControlledSaleRegisterService {

  private static final ZoneId IST = ZoneId.of("Asia/Kolkata");
  private static final DateTimeFormatter IST_TS =
      DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm").withZone(IST);

  private final AppUserRepository appUserRepository;
  private final AccessQueryService accessQueryService;
  private final ControlledSaleRegisterRepository controlledSaleRegisterRepository;

  public ControlledSaleRegisterService(
      AppUserRepository appUserRepository,
      AccessQueryService accessQueryService,
      ControlledSaleRegisterRepository controlledSaleRegisterRepository) {
    this.appUserRepository = appUserRepository;
    this.accessQueryService = accessQueryService;
    this.controlledSaleRegisterRepository = controlledSaleRegisterRepository;
  }

  @Transactional(readOnly = true)
  public ControlledSaleResult list(
      AuthPrincipal principal,
      UUID branchId,
      String schedule,
      UUID productId,
      UUID patientId,
      UUID pharmacistUserId,
      Instant from,
      Instant to) {
    Context ctx = requireViewerBranch(principal);
    assertExportScope(ctx.branchId(), branchId);
    ScheduleClassification classification = ControlledSalePolicy.parseSchedule(schedule);
    Instant fromBound = from == null ? Instant.EPOCH : from;
    Instant toBound = to == null ? Instant.parse("9999-12-31T00:00:00Z") : to;
    List<ControlledSaleLineView> items =
        controlledSaleRegisterRepository
            .findFiltered(
                ctx.tenantId(),
                ctx.branchId(),
                productId,
                patientId,
                pharmacistUserId,
                classification,
                fromBound,
                toBound)
            .stream()
            .map(ControlledSaleRegisterService::toView)
            .toList();
    return new ControlledSaleResult(items);
  }

  @Transactional(readOnly = true)
  public String exportCsv(
      AuthPrincipal principal,
      String format,
      UUID branchId,
      String schedule,
      UUID productId,
      UUID patientId,
      UUID pharmacistUserId,
      Instant from,
      Instant to) {
    Context ctx = requireViewerBranch(principal);
    assertExportScope(ctx.branchId(), branchId);
    ScheduleClassification classification = ControlledSalePolicy.parseSchedule(schedule);
    String kind =
        format == null || format.isBlank() ? "csv" : format.trim().toLowerCase(Locale.ROOT);
    Instant fromBound = from == null ? Instant.EPOCH : from;
    Instant toBound = to == null ? Instant.parse("9999-12-31T00:00:00Z") : to;
    List<ControlledSaleRegister> rows =
        controlledSaleRegisterRepository.findFilteredAscending(
            ctx.tenantId(),
            ctx.branchId(),
            productId,
            patientId,
            pharmacistUserId,
            classification,
            fromBound,
            toBound);
    if ("ndps".equals(kind)) {
      return ndpsCsv(rows);
    }
    if ("csv".equals(kind)) {
      return generalCsv(rows);
    }
    throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
  }

  private Context requireViewerBranch(AuthPrincipal principal) {
    if (principal == null || principal.tenantId() == null) {
      throw ControlledSalePolicy.forbidden();
    }
    AppUser user =
        appUserRepository
            .findById(principal.userId())
            .orElseThrow(ControlledSalePolicy::forbidden);
    if (user.getDeletedAt() != null || !principal.tenantId().equals(user.getTenantId())) {
      throw ControlledSalePolicy.forbidden();
    }
    boolean pharmacist = accessQueryService.hasAssignedRoleCode(user, "pharmacist");
    ControlledSalePolicy.requireViewer(user.getRole(), pharmacist);
    if (principal.activeBranchId() == null) {
      throw ControlledSalePolicy.noBranch();
    }
    return new Context(principal.tenantId(), principal.activeBranchId());
  }

  private void assertExportScope(UUID sessionBranchId, UUID requestedBranchId) {
    if (requestedBranchId != null && !requestedBranchId.equals(sessionBranchId)) {
      throw ControlledSalePolicy.notFound();
    }
  }

  private static ControlledSaleLineView toView(ControlledSaleRegister row) {
    return new ControlledSaleLineView(
        row.getId(),
        row.getKind().name(),
        row.getProductId(),
        row.getProductName(),
        row.getSku(),
        row.getScheduleClassification(),
        row.getBatchId(),
        row.getBatchNumber(),
        row.getQuantity(),
        row.getPrescriptionReference(),
        row.getPatientId(),
        row.getPatientName(),
        row.getPharmacistUserId(),
        row.getPharmacistName(),
        row.getPharmacistRegistration(),
        row.getOccurredAt(),
        row.getSalesInvoiceId(),
        row.getSalesInvoiceLineId(),
        row.getSalesReturnId(),
        row.getSalesReturnLineId(),
        row.getSourceRegisterId());
  }

  private static String generalCsv(List<ControlledSaleRegister> rows) {
    StringBuilder csv = new StringBuilder();
    csv.append(
        "id,kind,occurred_at,product_name,sku,schedule,batch_number,quantity,prescription_reference,patient_id,patient_name,pharmacist_user_id,pharmacist_name,pharmacist_registration,sales_invoice_id,sales_invoice_line_id,sales_return_id,sales_return_line_id,source_register_id\n");
    for (ControlledSaleRegister row : rows) {
      csv.append(row.getId())
          .append(',')
          .append(row.getKind().name())
          .append(',')
          .append(row.getOccurredAt())
          .append(',')
          .append(csvEscape(row.getProductName()))
          .append(',')
          .append(csvEscape(row.getSku()))
          .append(',')
          .append(
              row.getScheduleClassification() == null ? "" : row.getScheduleClassification().name())
          .append(',')
          .append(csvEscape(row.getBatchNumber()))
          .append(',')
          .append(plain(row.getQuantity()))
          .append(',')
          .append(csvEscape(row.getPrescriptionReference()))
          .append(',')
          .append(row.getPatientId())
          .append(',')
          .append(csvEscape(row.getPatientName()))
          .append(',')
          .append(row.getPharmacistUserId())
          .append(',')
          .append(csvEscape(row.getPharmacistName()))
          .append(',')
          .append(csvEscape(row.getPharmacistRegistration()))
          .append(',')
          .append(row.getSalesInvoiceId())
          .append(',')
          .append(row.getSalesInvoiceLineId())
          .append(',')
          .append(row.getSalesReturnId() == null ? "" : row.getSalesReturnId())
          .append(',')
          .append(row.getSalesReturnLineId() == null ? "" : row.getSalesReturnLineId())
          .append(',')
          .append(row.getSourceRegisterId() == null ? "" : row.getSourceRegisterId())
          .append('\n');
    }
    return csv.toString();
  }

  private static String ndpsCsv(List<ControlledSaleRegister> rows) {
    StringBuilder csv = new StringBuilder();
    csv.append(
        "date_ist,patient_name,prescription_reference,product_name,batch_number,issue_qty,return_qty,pharmacist_name,pharmacist_registration,schedule\n");
    for (ControlledSaleRegister row : rows) {
      boolean sale = row.getKind() == com.nammamedmate.server.domain.ControlledSaleKind.SALE;
      csv.append(IST_TS.format(row.getOccurredAt()))
          .append(',')
          .append(csvEscape(row.getPatientName()))
          .append(',')
          .append(csvEscape(row.getPrescriptionReference()))
          .append(',')
          .append(csvEscape(row.getProductName()))
          .append(',')
          .append(csvEscape(row.getBatchNumber()))
          .append(',')
          .append(sale ? plain(row.getQuantity()) : "0")
          .append(',')
          .append(sale ? "0" : plain(row.getQuantity()))
          .append(',')
          .append(csvEscape(row.getPharmacistName()))
          .append(',')
          .append(csvEscape(row.getPharmacistRegistration()))
          .append(',')
          .append(
              row.getScheduleClassification() == null ? "" : row.getScheduleClassification().name())
          .append('\n');
    }
    return csv.toString();
  }

  private static String plain(BigDecimal value) {
    return value.stripTrailingZeros().toPlainString();
  }

  private static String csvEscape(String value) {
    if (value == null) {
      return "";
    }
    if (value.indexOf(',') >= 0 || value.indexOf('"') >= 0) {
      return '"' + value.replace("\"", "\"\"") + '"';
    }
    return value;
  }

  private record Context(UUID tenantId, UUID branchId) {}
}
