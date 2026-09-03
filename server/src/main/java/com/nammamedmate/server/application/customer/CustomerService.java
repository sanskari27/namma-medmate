package com.nammamedmate.server.application.customer;

import com.nammamedmate.server.application.access.AccessQueryService;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.Customer;
import com.nammamedmate.server.domain.ModuleCode;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.CustomerRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CustomerService {

  static final String PHONE_TAKEN_CODE = "PHONE_TAKEN";
  static final String PHONE_TAKEN_MESSAGE =
      "A customer with this phone already exists. Search or open the existing profile.";

  private final CustomerRepository customerRepository;
  private final AppUserRepository appUserRepository;
  private final AccessQueryService accessQueryService;
  private final Clock clock;

  public CustomerService(
      CustomerRepository customerRepository,
      AppUserRepository appUserRepository,
      AccessQueryService accessQueryService,
      Clock clock) {
    this.customerRepository = customerRepository;
    this.appUserRepository = appUserRepository;
    this.accessQueryService = accessQueryService;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public List<CustomerView> list(AuthPrincipal principal, String query) {
    UUID tenantId = requireCrmAccess(principal);
    String q = query == null ? "" : query.trim();
    List<Customer> rows =
        q.isEmpty()
            ? customerRepository.findAllByTenantIdAndDeletedAtIsNullOrderByNameAsc(tenantId)
            : customerRepository.searchByTenant(tenantId, q);
    return rows.stream().map(CustomerService::toView).toList();
  }

  @Transactional(readOnly = true)
  public CustomerView get(AuthPrincipal principal, UUID id) {
    UUID tenantId = requireCrmAccess(principal);
    return toView(requireCustomer(id, tenantId));
  }

  @Transactional
  public CustomerView create(
      AuthPrincipal principal,
      String name,
      String phone,
      String email,
      LocalDate dateOfBirth,
      String gender,
      String address,
      String bloodGroup,
      String allergies,
      String chronicConditions) {
    UUID tenantId = requireCrmAccess(principal);
    String normalizedName = requireName(name);
    String normalizedPhone = requirePhone(phone);
    assertPhoneAvailable(tenantId, normalizedPhone, null);

    Instant now = clock.instant();
    Customer customer = new Customer();
    customer.setId(UUID.randomUUID());
    customer.setTenantId(tenantId);
    customer.setName(normalizedName);
    customer.setPhone(normalizedPhone);
    customer.setEmail(blankToNull(email));
    customer.setDateOfBirth(dateOfBirth);
    customer.setGender(blankToNull(gender));
    customer.setAddress(blankToNull(address));
    customer.setBloodGroup(blankToNull(bloodGroup));
    customer.setAllergies(blankToNull(allergies));
    customer.setChronicConditions(blankToNull(chronicConditions));
    customer.setCreatedAt(now);
    customer.setUpdatedAt(now);
    return toView(customerRepository.save(customer));
  }

  @Transactional
  public CustomerView update(
      AuthPrincipal principal,
      UUID id,
      String name,
      String phone,
      String email,
      LocalDate dateOfBirth,
      String gender,
      String address,
      String bloodGroup,
      String allergies,
      String chronicConditions) {
    UUID tenantId = requireCrmAccess(principal);
    Customer customer = requireCustomer(id, tenantId);
    String normalizedName = requireName(name);
    String normalizedPhone = requirePhone(phone);
    assertPhoneAvailable(tenantId, normalizedPhone, id);

    Instant now = clock.instant();
    customer.setName(normalizedName);
    customer.setPhone(normalizedPhone);
    customer.setEmail(blankToNull(email));
    customer.setDateOfBirth(dateOfBirth);
    customer.setGender(blankToNull(gender));
    customer.setAddress(blankToNull(address));
    customer.setBloodGroup(blankToNull(bloodGroup));
    customer.setAllergies(blankToNull(allergies));
    customer.setChronicConditions(blankToNull(chronicConditions));
    customer.setUpdatedAt(now);
    return toView(customerRepository.save(customer));
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
            .orElseThrow(CustomerService::forbidden);
    if (!accessQueryService.effectiveModules(user).contains(ModuleCode.CRM)) {
      throw forbidden();
    }
    return principal.tenantId();
  }

  private Customer requireCustomer(UUID id, UUID tenantId) {
    return customerRepository
        .findByIdAndTenantIdAndDeletedAtIsNull(id, tenantId)
        .orElseThrow(
            () -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Customer was not found"));
  }

  private void assertPhoneAvailable(UUID tenantId, String phone, UUID excludeId) {
    customerRepository
        .findByTenantIdAndPhoneAndDeletedAtIsNull(tenantId, phone)
        .ifPresent(
            existing -> {
              if (excludeId == null || !existing.getId().equals(excludeId)) {
                throw new ApiException(HttpStatus.CONFLICT, PHONE_TAKEN_CODE, PHONE_TAKEN_MESSAGE);
              }
            });
  }

  private static String requireName(String name) {
    if (name == null || name.isBlank()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
    String trimmed = name.trim();
    if (trimmed.length() > 200) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
    return trimmed;
  }

  private static String requirePhone(String phone) {
    if (phone == null || phone.isBlank()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
    String trimmed = phone.trim();
    if (trimmed.length() > 32) {
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

  private static CustomerView toView(Customer customer) {
    return new CustomerView(
        customer.getId(),
        customer.getTenantId(),
        customer.getName(),
        customer.getPhone(),
        customer.getEmail(),
        customer.getDateOfBirth(),
        customer.getGender(),
        customer.getAddress(),
        customer.getBloodGroup(),
        customer.getAllergies(),
        customer.getChronicConditions(),
        customer.getCreatedAt(),
        customer.getUpdatedAt());
  }

  private static ApiException forbidden() {
    return new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Forbidden");
  }
}
