package com.nammamedmate.server.application.compliance;

import com.nammamedmate.server.application.access.AccessQueryService;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.ControlledStockPolicy;
import com.nammamedmate.server.domain.ControlledStockRegister;
import com.nammamedmate.server.domain.Customer;
import com.nammamedmate.server.domain.Doctor;
import com.nammamedmate.server.domain.ModuleCode;
import com.nammamedmate.server.domain.Product;
import com.nammamedmate.server.domain.ScheduleClassification;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.ControlledStockRegisterRepository;
import com.nammamedmate.server.persistence.CustomerRepository;
import com.nammamedmate.server.persistence.DoctorRepository;
import com.nammamedmate.server.persistence.ProductRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ControlledStockService {

  private static final ZoneId IST = ZoneId.of("Asia/Kolkata");
  private static final DateTimeFormatter IST_TS =
      DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm").withZone(IST);
  private static final String NO_BRANCH_CODE = "NO_ACTIVE_BRANCH";
  private static final String NO_BRANCH_MESSAGE =
      "Select an outlet before opening the schedule register.";

  private final AppUserRepository appUserRepository;
  private final AccessQueryService accessQueryService;
  private final ProductRepository productRepository;
  private final CustomerRepository customerRepository;
  private final DoctorRepository doctorRepository;
  private final ControlledStockRegisterRepository controlledStockRegisterRepository;

  public ControlledStockService(
      AppUserRepository appUserRepository,
      AccessQueryService accessQueryService,
      ProductRepository productRepository,
      CustomerRepository customerRepository,
      DoctorRepository doctorRepository,
      ControlledStockRegisterRepository controlledStockRegisterRepository) {
    this.appUserRepository = appUserRepository;
    this.accessQueryService = accessQueryService;
    this.productRepository = productRepository;
    this.customerRepository = customerRepository;
    this.doctorRepository = doctorRepository;
    this.controlledStockRegisterRepository = controlledStockRegisterRepository;
  }

  @Transactional(readOnly = true)
  public ControlledStockVerifyView verify(
      AuthPrincipal principal, ControlledStockVerifyCommand command) {
    AppUser user = requireSalesUser(principal);
    if (command == null || command.productIds() == null || command.productIds().isEmpty()) {
      throw validationError();
    }
    List<UUID> controlledIds = new ArrayList<>();
    Map<UUID, String> schedules = new LinkedHashMap<>();
    for (UUID productId : command.productIds()) {
      if (productId == null) {
        throw validationError();
      }
      Product product =
          productRepository
              .findByIdAndTenantId(productId, principal.tenantId())
              .orElseThrow(this::notFound);
      if (ControlledStockPolicy.isControlled(product)) {
        controlledIds.add(product.getId());
        ScheduleClassification schedule = product.getScheduleClassification();
        schedules.put(product.getId(), schedule == null ? "CONTROLLED" : schedule.name());
      }
    }
    if (controlledIds.isEmpty()) {
      return new ControlledStockVerifyView(true, List.of(), Map.of());
    }
    boolean pharmacist = accessQueryService.hasAssignedRoleCode(user, "pharmacist");
    ControlledStockPolicy.requireDispenseAuthority(user.getRole(), pharmacist);
    ControlledStockPolicy.requirePrescriptionVerified(
        command.customerId(), command.doctorId(), command.prescriptionVerified());
    requireCustomer(command.customerId(), principal.tenantId());
    requireDoctor(command.doctorId(), principal.tenantId());
    return new ControlledStockVerifyView(true, List.copyOf(controlledIds), Map.copyOf(schedules));
  }

  @Transactional(readOnly = true)
  public ControlledStockResult list(
      AuthPrincipal principal,
      UUID branchId,
      String schedule,
      UUID productId,
      Instant from,
      Instant to) {
    Context ctx = requireInventoryBranch(principal);
    assertExportScope(ctx.branchId(), branchId);
    ScheduleClassification classification = parseSchedule(schedule);
    Instant fromBound = from == null ? Instant.EPOCH : from;
    Instant toBound = to == null ? Instant.parse("9999-12-31T00:00:00Z") : to;
    List<ControlledStockLineView> items =
        controlledStockRegisterRepository
            .findFiltered(
                ctx.tenantId(), ctx.branchId(), productId, classification, fromBound, toBound)
            .stream()
            .map(ControlledStockService::toView)
            .toList();
    return new ControlledStockResult(items);
  }

  @Transactional(readOnly = true)
  public String exportCsv(
      AuthPrincipal principal,
      String format,
      UUID branchId,
      String schedule,
      UUID productId,
      Instant from,
      Instant to) {
    Context ctx = requireInventoryBranch(principal);
    assertExportScope(ctx.branchId(), branchId);
    ScheduleClassification classification = parseSchedule(schedule);
    String kind =
        format == null || format.isBlank() ? "csv" : format.trim().toLowerCase(Locale.ROOT);
    Instant fromBound = from == null ? Instant.EPOCH : from;
    Instant toBound = to == null ? Instant.parse("9999-12-31T00:00:00Z") : to;
    List<ControlledStockRegister> rows =
        controlledStockRegisterRepository.findFilteredAscending(
            ctx.tenantId(), ctx.branchId(), productId, classification, fromBound, toBound);
    if ("ndps".equals(kind)) {
      return ndpsCsv(rows);
    }
    if ("csv".equals(kind)) {
      return generalCsv(rows);
    }
    throw validationError();
  }

  private AppUser requireSalesUser(AuthPrincipal principal) {
    if (principal == null || principal.tenantId() == null) {
      throw forbidden();
    }
    AppUser user =
        appUserRepository
            .findById(principal.userId())
            .orElseThrow(ControlledStockService::forbidden);
    if (user.getDeletedAt() != null || !principal.tenantId().equals(user.getTenantId())) {
      throw forbidden();
    }
    if (!accessQueryService.effectiveModules(user).contains(ModuleCode.SALES)) {
      throw forbidden();
    }
    return user;
  }

  private Context requireInventoryBranch(AuthPrincipal principal) {
    if (principal == null || principal.tenantId() == null) {
      throw forbidden();
    }
    AppUser user =
        appUserRepository
            .findById(principal.userId())
            .orElseThrow(ControlledStockService::forbidden);
    if (user.getDeletedAt() != null || !principal.tenantId().equals(user.getTenantId())) {
      throw forbidden();
    }
    if (!accessQueryService.effectiveModules(user).contains(ModuleCode.INVENTORY)) {
      throw forbidden();
    }
    if (principal.activeBranchId() == null) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, NO_BRANCH_CODE, NO_BRANCH_MESSAGE);
    }
    return new Context(principal.tenantId(), principal.activeBranchId());
  }

  private void assertExportScope(UUID sessionBranchId, UUID requestedBranchId) {
    if (requestedBranchId != null && !requestedBranchId.equals(sessionBranchId)) {
      throw notFound();
    }
  }

  private Customer requireCustomer(UUID customerId, UUID tenantId) {
    return customerRepository
        .findByIdAndTenantIdAndDeletedAtIsNull(customerId, tenantId)
        .orElseThrow(this::notFound);
  }

  private Doctor requireDoctor(UUID doctorId, UUID tenantId) {
    return doctorRepository
        .findByIdAndTenantIdAndDeletedAtIsNull(doctorId, tenantId)
        .orElseThrow(this::notFound);
  }

  private static ControlledStockLineView toView(ControlledStockRegister row) {
    return new ControlledStockLineView(
        row.getId(),
        row.getStockMovementId(),
        row.getProductId(),
        row.getProductName(),
        row.getSku(),
        row.getScheduleClassification(),
        row.getBatchId(),
        row.getBatchNumber(),
        row.getExpiresOn(),
        row.getQuantity(),
        row.getBalanceAfter(),
        row.getMovementType().name(),
        row.getCreatedByUserId(),
        row.getOccurredAt());
  }

  private static String generalCsv(List<ControlledStockRegister> rows) {
    StringBuilder csv = new StringBuilder();
    csv.append(
        "occurred_at,movement_type,product_name,sku,schedule,batch_number,quantity,balance_after,created_by_user_id\n");
    for (ControlledStockRegister row : rows) {
      csv.append(row.getOccurredAt())
          .append(',')
          .append(row.getMovementType().name())
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
          .append(plain(row.getBalanceAfter()))
          .append(',')
          .append(row.getCreatedByUserId())
          .append('\n');
    }
    return csv.toString();
  }

  private static String ndpsCsv(List<ControlledStockRegister> rows) {
    StringBuilder csv = new StringBuilder();
    csv.append(
        "date_ist,particulars,opening_qty,receipt_qty,issue_qty,closing_qty,schedule,batch_number,actor_user_id\n");
    for (ControlledStockRegister row : rows) {
      boolean inbound = ControlledStockPolicy.isInbound(row.getMovementType());
      BigDecimal signed = inbound ? row.getQuantity() : row.getQuantity().negate();
      BigDecimal opening = row.getBalanceAfter().subtract(signed);
      String particulars =
          row.getMovementType().name()
              + " "
              + row.getProductName()
              + (row.getBatchNumber() == null ? "" : " batch " + row.getBatchNumber());
      csv.append(IST_TS.format(row.getOccurredAt()))
          .append(',')
          .append(csvEscape(particulars))
          .append(',')
          .append(plain(opening))
          .append(',')
          .append(inbound ? plain(row.getQuantity()) : "0")
          .append(',')
          .append(inbound ? "0" : plain(row.getQuantity()))
          .append(',')
          .append(plain(row.getBalanceAfter()))
          .append(',')
          .append(
              row.getScheduleClassification() == null ? "" : row.getScheduleClassification().name())
          .append(',')
          .append(csvEscape(row.getBatchNumber()))
          .append(',')
          .append(row.getCreatedByUserId())
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

  private static ScheduleClassification parseSchedule(String schedule) {
    if (schedule == null || schedule.isBlank()) {
      return null;
    }
    try {
      return ScheduleClassification.valueOf(schedule.trim().toUpperCase(Locale.ROOT));
    } catch (IllegalArgumentException ex) {
      throw validationError();
    }
  }

  private static ApiException validationError() {
    return new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
  }

  private static ApiException forbidden() {
    return new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Access denied");
  }

  private ApiException notFound() {
    return new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Record was not found");
  }

  private record Context(UUID tenantId, UUID branchId) {}
}
