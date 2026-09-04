package com.nammamedmate.server.application.customerhistory;

import com.nammamedmate.server.application.access.AccessQueryService;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.Customer;
import com.nammamedmate.server.domain.CustomerHistoryFact;
import com.nammamedmate.server.domain.CustomerHistoryFactType;
import com.nammamedmate.server.domain.Doctor;
import com.nammamedmate.server.domain.ModuleCode;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.CustomerHistoryFactRepository;
import com.nammamedmate.server.persistence.CustomerRepository;
import com.nammamedmate.server.persistence.DoctorRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.time.Clock;
import java.time.Instant;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CustomerHistoryService {

  private final CustomerHistoryFactRepository customerHistoryFactRepository;
  private final CustomerRepository customerRepository;
  private final DoctorRepository doctorRepository;
  private final AppUserRepository appUserRepository;
  private final AccessQueryService accessQueryService;
  private final Clock clock;

  public CustomerHistoryService(
      CustomerHistoryFactRepository customerHistoryFactRepository,
      CustomerRepository customerRepository,
      DoctorRepository doctorRepository,
      AppUserRepository appUserRepository,
      AccessQueryService accessQueryService,
      Clock clock) {
    this.customerHistoryFactRepository = customerHistoryFactRepository;
    this.customerRepository = customerRepository;
    this.doctorRepository = doctorRepository;
    this.appUserRepository = appUserRepository;
    this.accessQueryService = accessQueryService;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public CustomerHistoryView list(AuthPrincipal principal, UUID customerId) {
    UUID tenantId = requireCrmAccess(principal);
    requireCustomer(customerId, tenantId);
    List<CustomerHistoryFact> facts =
        customerHistoryFactRepository.findAllByTenantIdAndCustomerIdOrderByOccurredAtDesc(
            tenantId, customerId);
    return new CustomerHistoryView(toItems(tenantId, facts));
  }

  @Transactional(readOnly = true)
  public CustomerHistoryView listForCustomers(
      UUID tenantId, Collection<UUID> customerIds, UUID memberId, CustomerHistoryFactType type) {
    if (customerIds.isEmpty()) {
      return new CustomerHistoryView(List.of());
    }
    Collection<UUID> scope =
        memberId == null ? customerIds : customerIds.stream().filter(memberId::equals).toList();
    if (scope.isEmpty()) {
      return new CustomerHistoryView(List.of());
    }
    List<CustomerHistoryFact> facts =
        type == null
            ? customerHistoryFactRepository.findAllByTenantIdAndCustomerIdInOrderByOccurredAtDesc(
                tenantId, scope)
            : customerHistoryFactRepository
                .findAllByTenantIdAndCustomerIdInAndTypeOrderByOccurredAtDesc(
                    tenantId, scope, type);
    return new CustomerHistoryView(toItems(tenantId, facts));
  }

  /**
   * Records an immutable purchase or prescription history fact. Called by M6-S05 completion and
   * tests; not exposed as a public HTTP create API in M3-S04.
   */
  @Transactional
  public CustomerHistoryView.HistoryItem recordFact(
      UUID tenantId,
      UUID customerId,
      UUID branchId,
      CustomerHistoryFactType type,
      String summary,
      String prescriptionReference,
      UUID doctorId,
      UUID invoiceId,
      Long amountPaise,
      Instant occurredAt) {
    requireCustomer(customerId, tenantId);
    if (type == null) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
    String normalizedSummary = requireSummary(summary);
    if (doctorId != null
        && doctorRepository.findByIdAndTenantIdAndDeletedAtIsNull(doctorId, tenantId).isEmpty()) {
      throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Doctor was not found");
    }
    Instant now = clock.instant();
    CustomerHistoryFact fact = new CustomerHistoryFact();
    fact.setId(UUID.randomUUID());
    fact.setTenantId(tenantId);
    fact.setCustomerId(customerId);
    fact.setBranchId(branchId);
    fact.setType(type);
    fact.setSummary(normalizedSummary);
    fact.setPrescriptionReference(blankToNull(prescriptionReference));
    fact.setDoctorId(doctorId);
    fact.setInvoiceId(invoiceId);
    fact.setAmountPaise(amountPaise);
    fact.setOccurredAt(occurredAt == null ? now : occurredAt);
    fact.setCreatedAt(now);
    CustomerHistoryFact saved = customerHistoryFactRepository.save(fact);
    Map<UUID, String> doctorNames = doctorNames(tenantId, List.of(saved));
    return toItem(saved, doctorNames);
  }

  private List<CustomerHistoryView.HistoryItem> toItems(
      UUID tenantId, List<CustomerHistoryFact> facts) {
    Map<UUID, String> doctorNames = doctorNames(tenantId, facts);
    return facts.stream().map(fact -> toItem(fact, doctorNames)).toList();
  }

  private Map<UUID, String> doctorNames(UUID tenantId, List<CustomerHistoryFact> facts) {
    Set<UUID> doctorIds =
        facts.stream()
            .map(CustomerHistoryFact::getDoctorId)
            .filter(Objects::nonNull)
            .collect(Collectors.toSet());
    if (doctorIds.isEmpty()) {
      return Map.of();
    }
    Map<UUID, String> names = new HashMap<>();
    for (Doctor doctor : doctorRepository.findAllById(doctorIds)) {
      if (tenantId.equals(doctor.getTenantId()) && doctor.getDeletedAt() == null) {
        names.put(doctor.getId(), doctor.getName());
      }
    }
    return names;
  }

  private static CustomerHistoryView.HistoryItem toItem(
      CustomerHistoryFact fact, Map<UUID, String> doctorNames) {
    return new CustomerHistoryView.HistoryItem(
        fact.getId(),
        fact.getCustomerId(),
        fact.getType(),
        fact.getSummary(),
        fact.getPrescriptionReference(),
        fact.getDoctorId(),
        fact.getDoctorId() == null ? null : doctorNames.get(fact.getDoctorId()),
        fact.getInvoiceId(),
        fact.getAmountPaise(),
        fact.getOccurredAt());
  }

  private Customer requireCustomer(UUID customerId, UUID tenantId) {
    return customerRepository
        .findByIdAndTenantIdAndDeletedAtIsNull(customerId, tenantId)
        .orElseThrow(
            () -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Customer was not found"));
  }

  private UUID requireCrmAccess(AuthPrincipal principal) {
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
            .orElseThrow(CustomerHistoryService::forbidden);
    if (!accessQueryService.effectiveModules(user).contains(ModuleCode.CRM)) {
      throw forbidden();
    }
    return principal.tenantId();
  }

  private static String requireSummary(String summary) {
    if (summary == null || summary.isBlank()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
    String trimmed = summary.trim();
    if (trimmed.length() > 500) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
    return trimmed;
  }

  private static String blankToNull(String value) {
    if (value == null || value.isBlank()) {
      return null;
    }
    return value.trim();
  }

  private static ApiException forbidden() {
    return new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Forbidden");
  }
}
