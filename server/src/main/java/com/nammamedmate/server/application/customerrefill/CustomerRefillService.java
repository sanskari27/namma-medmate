package com.nammamedmate.server.application.customerrefill;

import com.nammamedmate.server.application.access.AccessQueryService;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.Customer;
import com.nammamedmate.server.domain.CustomerRefillSchedule;
import com.nammamedmate.server.domain.CustomerTag;
import com.nammamedmate.server.domain.CustomerTagAssignment;
import com.nammamedmate.server.domain.ModuleCode;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.CustomerRefillScheduleRepository;
import com.nammamedmate.server.persistence.CustomerRepository;
import com.nammamedmate.server.persistence.CustomerTagAssignmentRepository;
import com.nammamedmate.server.persistence.CustomerTagRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CustomerRefillService {

  public static final int DEFAULT_INTERVAL_DAYS = 30;

  private final CustomerRefillScheduleRepository refillRepository;
  private final CustomerTagRepository tagRepository;
  private final CustomerTagAssignmentRepository assignmentRepository;
  private final CustomerRepository customerRepository;
  private final AppUserRepository appUserRepository;
  private final AccessQueryService accessQueryService;
  private final Clock clock;

  public CustomerRefillService(
      CustomerRefillScheduleRepository refillRepository,
      CustomerTagRepository tagRepository,
      CustomerTagAssignmentRepository assignmentRepository,
      CustomerRepository customerRepository,
      AppUserRepository appUserRepository,
      AccessQueryService accessQueryService,
      Clock clock) {
    this.refillRepository = refillRepository;
    this.tagRepository = tagRepository;
    this.assignmentRepository = assignmentRepository;
    this.customerRepository = customerRepository;
    this.appUserRepository = appUserRepository;
    this.accessQueryService = accessQueryService;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public CustomerRefillListView listRefills(AuthPrincipal principal, UUID customerId) {
    UUID tenantId = requireCrmAccess(principal);
    requireCustomer(customerId, tenantId);
    List<CustomerRefillView> items =
        refillRepository
            .findAllByTenantIdAndCustomerIdOrderByNextDueOnAscMedicineNameAsc(tenantId, customerId)
            .stream()
            .map(this::toRefillView)
            .toList();
    return new CustomerRefillListView(items);
  }

  @Transactional(readOnly = true)
  public CustomerRefillDueView listDue(AuthPrincipal principal) {
    UUID tenantId = requireCrmAccess(principal);
    LocalDate today = LocalDate.ofInstant(clock.instant(), ZoneOffset.UTC);
    List<CustomerRefillSchedule> due =
        refillRepository.findAllByTenantIdAndNextDueOnLessThanEqualOrderByNextDueOnAsc(
            tenantId, today);
    Map<UUID, Customer> customers = new HashMap<>();
    for (CustomerRefillSchedule schedule : due) {
      customerRepository
          .findByIdAndTenantIdAndDeletedAtIsNull(schedule.getCustomerId(), tenantId)
          .ifPresent(customer -> customers.put(customer.getId(), customer));
    }
    List<CustomerRefillDueView.DueItem> items =
        due.stream()
            .map(
                schedule -> {
                  Customer customer = customers.get(schedule.getCustomerId());
                  if (customer == null) {
                    return null;
                  }
                  return new CustomerRefillDueView.DueItem(
                      schedule.getId(),
                      customer.getId(),
                      customer.getName(),
                      customer.getPhone(),
                      schedule.getMedicineName(),
                      schedule.getIntervalDays(),
                      schedule.getNextDueOn(),
                      schedule.getVersion());
                })
            .filter(Objects::nonNull)
            .toList();
    return new CustomerRefillDueView(items);
  }

  @Transactional
  public CustomerRefillView createRefill(
      AuthPrincipal principal,
      UUID customerId,
      String medicineName,
      Integer intervalDays,
      LocalDate nextDueOn) {
    UUID tenantId = requireCrmAccess(principal);
    requireCustomer(customerId, tenantId);
    String name = requireMedicineName(medicineName);
    int interval = intervalDays == null ? DEFAULT_INTERVAL_DAYS : intervalDays;
    if (interval <= 0) {
      throw validationError();
    }
    Instant now = clock.instant();
    LocalDate due =
        nextDueOn != null ? nextDueOn : LocalDate.ofInstant(now, ZoneOffset.UTC).plusDays(interval);

    if (refillRepository
        .findByTenantIdAndCustomerIdAndMedicineNameIgnoreCase(tenantId, customerId, name)
        .isPresent()) {
      throw duplicateRefill();
    }

    CustomerRefillSchedule schedule = new CustomerRefillSchedule();
    schedule.setId(UUID.randomUUID());
    schedule.setTenantId(tenantId);
    schedule.setCustomerId(customerId);
    schedule.setMedicineName(name);
    schedule.setIntervalDays(interval);
    schedule.setNextDueOn(due);
    schedule.setVersion(0L);
    schedule.setCreatedAt(now);
    schedule.setUpdatedAt(now);
    try {
      refillRepository.saveAndFlush(schedule);
    } catch (DataIntegrityViolationException ex) {
      throw duplicateRefill();
    }
    return toRefillView(schedule);
  }

  @Transactional
  public CustomerRefillView updateRefill(
      AuthPrincipal principal,
      UUID customerId,
      UUID refillId,
      Integer intervalDays,
      LocalDate nextDueOn,
      Long expectedVersion) {
    UUID tenantId = requireCrmAccess(principal);
    requireCustomer(customerId, tenantId);
    if (intervalDays == null || intervalDays <= 0 || nextDueOn == null || expectedVersion == null) {
      throw validationError();
    }
    CustomerRefillSchedule schedule =
        refillRepository
            .lockByTenantIdAndCustomerIdAndId(tenantId, customerId, refillId)
            .orElseThrow(
                () -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Refill was not found"));
    if (schedule.getVersion() != expectedVersion) {
      throw stale();
    }
    Instant now = clock.instant();
    schedule.setIntervalDays(intervalDays);
    schedule.setNextDueOn(nextDueOn);
    schedule.setVersion(schedule.getVersion() + 1);
    schedule.setUpdatedAt(now);
    refillRepository.save(schedule);
    return toRefillView(schedule);
  }

  @Transactional
  public void deleteRefill(AuthPrincipal principal, UUID customerId, UUID refillId) {
    UUID tenantId = requireCrmAccess(principal);
    requireCustomer(customerId, tenantId);
    CustomerRefillSchedule schedule =
        refillRepository
            .lockByTenantIdAndCustomerIdAndId(tenantId, customerId, refillId)
            .orElseThrow(
                () -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Refill was not found"));
    refillRepository.delete(schedule);
  }

  @Transactional(readOnly = true)
  public CustomerTagListView listTags(AuthPrincipal principal) {
    UUID tenantId = requireCrmAccess(principal);
    List<CustomerTagView> items =
        tagRepository.findAllByTenantIdOrderByNameAsc(tenantId).stream()
            .map(this::toTagView)
            .toList();
    return new CustomerTagListView(items);
  }

  @Transactional
  public CustomerTagView createTag(AuthPrincipal principal, String rawName) {
    UUID tenantId = requireCrmAccess(principal);
    String name = requireTagName(rawName);
    if (tagRepository.findByTenantIdAndNameIgnoreCase(tenantId, name).isPresent()) {
      throw duplicateTag();
    }
    Instant now = clock.instant();
    CustomerTag tag = new CustomerTag();
    tag.setId(UUID.randomUUID());
    tag.setTenantId(tenantId);
    tag.setName(name);
    tag.setCreatedAt(now);
    tag.setUpdatedAt(now);
    try {
      tagRepository.saveAndFlush(tag);
    } catch (DataIntegrityViolationException ex) {
      throw duplicateTag();
    }
    return toTagView(tag);
  }

  @Transactional
  public void deleteTag(AuthPrincipal principal, UUID tagId) {
    UUID tenantId = requireCrmAccess(principal);
    CustomerTag tag =
        tagRepository
            .findByIdAndTenantId(tagId, tenantId)
            .orElseThrow(
                () -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Tag was not found"));
    if (assignmentRepository.countByTenantIdAndTagId(tenantId, tagId) > 0) {
      throw new ApiException(HttpStatus.CONFLICT, "TAG_IN_USE", "Tag is assigned to customers");
    }
    tagRepository.delete(tag);
  }

  @Transactional(readOnly = true)
  public CustomerTagListView listCustomerTags(AuthPrincipal principal, UUID customerId) {
    UUID tenantId = requireCrmAccess(principal);
    requireCustomer(customerId, tenantId);
    return customerTags(tenantId, customerId);
  }

  @Transactional
  public CustomerTagListView replaceCustomerTags(
      AuthPrincipal principal, UUID customerId, List<UUID> tagIds) {
    UUID tenantId = requireCrmAccess(principal);
    requireCustomer(customerId, tenantId);
    List<UUID> ids = tagIds == null ? List.of() : tagIds.stream().filter(Objects::nonNull).toList();
    Set<UUID> unique = new HashSet<>(ids);
    if (unique.size() != ids.size()) {
      throw validationError();
    }
    if (!ids.isEmpty()) {
      List<CustomerTag> found = tagRepository.findAllByTenantIdAndIdIn(tenantId, ids);
      if (found.size() != unique.size()) {
        throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Tag was not found");
      }
    }
    assignmentRepository.deleteAllByTenantIdAndCustomerId(tenantId, customerId);
    Instant now = clock.instant();
    for (UUID tagId : unique) {
      CustomerTagAssignment assignment = new CustomerTagAssignment();
      assignment.setTenantId(tenantId);
      assignment.setCustomerId(customerId);
      assignment.setTagId(tagId);
      assignment.setCreatedAt(now);
      assignmentRepository.save(assignment);
    }
    assignmentRepository.flush();
    return customerTags(tenantId, customerId);
  }

  private CustomerTagListView customerTags(UUID tenantId, UUID customerId) {
    List<UUID> tagIds =
        assignmentRepository.findAllByTenantIdAndCustomerId(tenantId, customerId).stream()
            .map(CustomerTagAssignment::getTagId)
            .toList();
    if (tagIds.isEmpty()) {
      return new CustomerTagListView(List.of());
    }
    Map<UUID, CustomerTag> byId = new HashMap<>();
    for (CustomerTag tag : tagRepository.findAllByTenantIdAndIdIn(tenantId, tagIds)) {
      byId.put(tag.getId(), tag);
    }
    List<CustomerTagView> items =
        tagIds.stream()
            .map(byId::get)
            .filter(Objects::nonNull)
            .sorted((a, b) -> a.getName().compareToIgnoreCase(b.getName()))
            .map(this::toTagView)
            .toList();
    return new CustomerTagListView(items);
  }

  private CustomerRefillView toRefillView(CustomerRefillSchedule schedule) {
    return new CustomerRefillView(
        schedule.getId(),
        schedule.getCustomerId(),
        schedule.getMedicineName(),
        schedule.getIntervalDays(),
        schedule.getNextDueOn(),
        schedule.getVersion(),
        schedule.getUpdatedAt());
  }

  private CustomerTagView toTagView(CustomerTag tag) {
    return new CustomerTagView(tag.getId(), tag.getName(), tag.getCreatedAt());
  }

  private static String requireMedicineName(String raw) {
    if (raw == null || raw.isBlank()) {
      throw validationError();
    }
    String trimmed = raw.trim();
    if (trimmed.length() > 200) {
      throw validationError();
    }
    return trimmed;
  }

  private static String requireTagName(String raw) {
    if (raw == null || raw.isBlank()) {
      throw validationError();
    }
    String trimmed = raw.trim();
    if (trimmed.length() > 80) {
      throw validationError();
    }
    return trimmed;
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
            .orElseThrow(CustomerRefillService::forbidden);
    if (!accessQueryService.effectiveModules(user).contains(ModuleCode.CRM)) {
      throw forbidden();
    }
    return principal.tenantId();
  }

  private static ApiException validationError() {
    return new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
  }

  private static ApiException duplicateRefill() {
    return new ApiException(
        HttpStatus.CONFLICT,
        "DUPLICATE_REFILL",
        "A refill schedule already exists for this medicine");
  }

  private static ApiException duplicateTag() {
    return new ApiException(
        HttpStatus.CONFLICT, "DUPLICATE_TAG", "A tag with this name already exists");
  }

  private static ApiException stale() {
    return new ApiException(
        HttpStatus.CONFLICT, "STALE_STATE", "Refill was updated by someone else");
  }

  private static ApiException forbidden() {
    return new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Forbidden");
  }
}
