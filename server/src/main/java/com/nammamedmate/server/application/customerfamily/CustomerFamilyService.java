package com.nammamedmate.server.application.customerfamily;

import com.nammamedmate.server.application.access.AccessQueryService;
import com.nammamedmate.server.application.customerhistory.CustomerHistoryService;
import com.nammamedmate.server.application.customerhistory.CustomerHistoryView;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.Customer;
import com.nammamedmate.server.domain.CustomerFamily;
import com.nammamedmate.server.domain.CustomerFamilyMember;
import com.nammamedmate.server.domain.CustomerHistoryFactType;
import com.nammamedmate.server.domain.ModuleCode;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.CustomerFamilyMemberRepository;
import com.nammamedmate.server.persistence.CustomerFamilyRepository;
import com.nammamedmate.server.persistence.CustomerRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CustomerFamilyService {

  static final String ALREADY_IN_FAMILY_CODE = "ALREADY_IN_FAMILY";
  static final String SELF_LINK_CODE = "SELF_LINK";

  private final CustomerFamilyRepository customerFamilyRepository;
  private final CustomerFamilyMemberRepository customerFamilyMemberRepository;
  private final CustomerRepository customerRepository;
  private final AppUserRepository appUserRepository;
  private final AccessQueryService accessQueryService;
  private final CustomerHistoryService customerHistoryService;
  private final Clock clock;

  public CustomerFamilyService(
      CustomerFamilyRepository customerFamilyRepository,
      CustomerFamilyMemberRepository customerFamilyMemberRepository,
      CustomerRepository customerRepository,
      AppUserRepository appUserRepository,
      AccessQueryService accessQueryService,
      CustomerHistoryService customerHistoryService,
      Clock clock) {
    this.customerFamilyRepository = customerFamilyRepository;
    this.customerFamilyMemberRepository = customerFamilyMemberRepository;
    this.customerRepository = customerRepository;
    this.appUserRepository = appUserRepository;
    this.accessQueryService = accessQueryService;
    this.customerHistoryService = customerHistoryService;
    this.clock = clock;
  }

  @Transactional
  public CustomerFamilyView create(AuthPrincipal principal, List<UUID> memberIds) {
    UUID tenantId = requireCrmAccess(principal);
    List<UUID> uniqueIds = requireUniqueMemberIds(memberIds);
    List<Customer> customers = requireActiveCustomers(tenantId, uniqueIds);
    for (Customer customer : customers) {
      assertNotAlreadyInFamily(tenantId, customer.getId());
    }

    Instant now = clock.instant();
    CustomerFamily family = new CustomerFamily();
    family.setId(UUID.randomUUID());
    family.setTenantId(tenantId);
    family.setCreatedAt(now);
    family.setUpdatedAt(now);
    customerFamilyRepository.save(family);

    for (Customer customer : customers) {
      saveMember(tenantId, family.getId(), customer.getId(), now);
    }
    return toView(family, customers);
  }

  @Transactional(readOnly = true)
  public CustomerFamilyView get(AuthPrincipal principal, UUID familyId) {
    UUID tenantId = requireCrmAccess(principal);
    CustomerFamily family = requireFamily(familyId, tenantId);
    return toView(family, loadMemberCustomers(tenantId, familyId));
  }

  @Transactional(readOnly = true)
  public CustomerFamilyView findByCustomer(AuthPrincipal principal, UUID customerId) {
    UUID tenantId = requireCrmAccess(principal);
    requireActiveCustomer(tenantId, customerId);
    CustomerFamilyMember membership =
        customerFamilyMemberRepository
            .findByTenantIdAndCustomerId(tenantId, customerId)
            .orElseThrow(CustomerFamilyService::notFound);
    CustomerFamily family = requireFamily(membership.getFamilyId(), tenantId);
    return toView(family, loadMemberCustomers(tenantId, family.getId()));
  }

  @Transactional
  public CustomerFamilyView addMember(AuthPrincipal principal, UUID familyId, UUID customerId) {
    UUID tenantId = requireCrmAccess(principal);
    CustomerFamily family = requireFamily(familyId, tenantId);
    if (customerId == null) {
      throw validationError();
    }
    if (customerFamilyMemberRepository.existsByTenantIdAndFamilyIdAndCustomerId(
        tenantId, familyId, customerId)) {
      throw alreadyInFamily();
    }
    Customer customer = requireActiveCustomer(tenantId, customerId);
    assertNotAlreadyInFamily(tenantId, customer.getId());

    Instant now = clock.instant();
    saveMember(tenantId, familyId, customer.getId(), now);
    family.setUpdatedAt(now);
    customerFamilyRepository.save(family);
    return toView(family, loadMemberCustomers(tenantId, familyId));
  }

  @Transactional
  public CustomerFamilyView removeMember(AuthPrincipal principal, UUID familyId, UUID customerId) {
    UUID tenantId = requireCrmAccess(principal);
    CustomerFamily family = requireFamily(familyId, tenantId);
    if (!customerFamilyMemberRepository.existsByTenantIdAndFamilyIdAndCustomerId(
        tenantId, familyId, customerId)) {
      throw notFound();
    }
    customerFamilyMemberRepository.deleteByTenantIdAndFamilyIdAndCustomerId(
        tenantId, familyId, customerId);

    long remaining = customerFamilyMemberRepository.countByTenantIdAndFamilyId(tenantId, familyId);
    if (remaining == 0) {
      customerFamilyRepository.delete(family);
      return new CustomerFamilyView(
          familyId, tenantId, family.getLabel(), List.of(), family.getCreatedAt());
    }
    Instant now = clock.instant();
    family.setUpdatedAt(now);
    customerFamilyRepository.save(family);
    return toView(family, loadMemberCustomers(tenantId, familyId));
  }

  @Transactional(readOnly = true)
  public FamilyHistoryView history(
      AuthPrincipal principal, UUID familyId, UUID memberId, String type) {
    UUID tenantId = requireCrmAccess(principal);
    requireFamily(familyId, tenantId);
    if (memberId != null
        && !customerFamilyMemberRepository.existsByTenantIdAndFamilyIdAndCustomerId(
            tenantId, familyId, memberId)) {
      throw notFound();
    }
    List<Customer> members = loadMemberCustomers(tenantId, familyId);
    Map<UUID, String> names = new HashMap<>();
    List<UUID> memberIds = new ArrayList<>();
    for (Customer member : members) {
      memberIds.add(member.getId());
      names.put(member.getId(), member.getName());
    }
    CustomerHistoryFactType factType = parseHistoryType(type);
    CustomerHistoryView history =
        customerHistoryService.listForCustomers(tenantId, memberIds, memberId, factType);
    return new FamilyHistoryView(
        history.items().stream()
            .map(
                item ->
                    new FamilyHistoryView.HistoryItem(
                        item.id(),
                        item.customerId(),
                        names.getOrDefault(item.customerId(), ""),
                        item.type().name(),
                        item.summary(),
                        item.occurredAt()))
            .toList());
  }

  private static CustomerHistoryFactType parseHistoryType(String type) {
    if (type == null || type.isBlank()) {
      return null;
    }
    try {
      return CustomerHistoryFactType.valueOf(type.trim().toUpperCase(Locale.ROOT));
    } catch (IllegalArgumentException ex) {
      throw validationError();
    }
  }

  private void saveMember(UUID tenantId, UUID familyId, UUID customerId, Instant now) {
    CustomerFamilyMember member = new CustomerFamilyMember();
    member.setId(UUID.randomUUID());
    member.setTenantId(tenantId);
    member.setFamilyId(familyId);
    member.setCustomerId(customerId);
    member.setCreatedAt(now);
    customerFamilyMemberRepository.save(member);
  }

  private List<UUID> requireUniqueMemberIds(List<UUID> memberIds) {
    if (memberIds == null || memberIds.isEmpty()) {
      throw validationError();
    }
    Set<UUID> seen = new HashSet<>();
    List<UUID> unique = new ArrayList<>();
    for (UUID id : memberIds) {
      if (id == null) {
        throw validationError();
      }
      if (!seen.add(id)) {
        throw selfLink();
      }
      unique.add(id);
    }
    return unique;
  }

  private List<Customer> requireActiveCustomers(UUID tenantId, List<UUID> ids) {
    List<Customer> customers = new ArrayList<>();
    for (UUID id : ids) {
      customers.add(requireActiveCustomer(tenantId, id));
    }
    return customers;
  }

  private Customer requireActiveCustomer(UUID tenantId, UUID customerId) {
    return customerRepository
        .findByIdAndTenantIdAndDeletedAtIsNull(customerId, tenantId)
        .orElseThrow(CustomerFamilyService::notFound);
  }

  private CustomerFamily requireFamily(UUID familyId, UUID tenantId) {
    return customerFamilyRepository
        .findByIdAndTenantId(familyId, tenantId)
        .orElseThrow(CustomerFamilyService::notFound);
  }

  private void assertNotAlreadyInFamily(UUID tenantId, UUID customerId) {
    if (customerFamilyMemberRepository
        .findByTenantIdAndCustomerId(tenantId, customerId)
        .isPresent()) {
      throw alreadyInFamily();
    }
  }

  private List<Customer> loadMemberCustomers(UUID tenantId, UUID familyId) {
    List<CustomerFamilyMember> members =
        customerFamilyMemberRepository.findAllByTenantIdAndFamilyIdOrderByCreatedAtAsc(
            tenantId, familyId);
    List<Customer> customers = new ArrayList<>();
    for (CustomerFamilyMember member : members) {
      customerRepository
          .findByIdAndTenantIdAndDeletedAtIsNull(member.getCustomerId(), tenantId)
          .ifPresent(customers::add);
    }
    return customers;
  }

  private CustomerFamilyView toView(CustomerFamily family, List<Customer> customers) {
    List<CustomerFamilyView.MemberView> members =
        customers.stream()
            .map(c -> new CustomerFamilyView.MemberView(c.getId(), c.getName(), c.getPhone()))
            .toList();
    return new CustomerFamilyView(
        family.getId(), family.getTenantId(), family.getLabel(), members, family.getCreatedAt());
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
            .orElseThrow(CustomerFamilyService::forbidden);
    if (!accessQueryService.effectiveModules(user).contains(ModuleCode.CRM)) {
      throw forbidden();
    }
    return principal.tenantId();
  }

  private static ApiException alreadyInFamily() {
    return new ApiException(
        HttpStatus.CONFLICT, ALREADY_IN_FAMILY_CODE, "This profile already belongs to a family.");
  }

  private static ApiException selfLink() {
    return new ApiException(
        HttpStatus.UNPROCESSABLE_ENTITY, SELF_LINK_CODE, "A profile cannot be linked to itself.");
  }

  private static ApiException notFound() {
    return new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Family was not found");
  }

  private static ApiException forbidden() {
    return new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Forbidden");
  }

  private static ApiException validationError() {
    return new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
  }
}
