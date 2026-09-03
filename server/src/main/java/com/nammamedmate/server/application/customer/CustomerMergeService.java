package com.nammamedmate.server.application.customer;

import com.nammamedmate.server.application.access.AccessQueryService;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.Customer;
import com.nammamedmate.server.domain.ModuleCode;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.CustomerRepository;
import com.nammamedmate.server.persistence.NotificationEventRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CustomerMergeService {

  private static final String MERGE_CONFLICTS_CODE = "MERGE_CONFLICTS";
  private static final String MERGE_CONFLICTS_MESSAGE =
      "Resolve every conflicting field before confirming the merge.";

  private final CustomerRepository customerRepository;
  private final NotificationEventRepository notificationEventRepository;
  private final AppUserRepository appUserRepository;
  private final AccessQueryService accessQueryService;
  private final Clock clock;

  public CustomerMergeService(
      CustomerRepository customerRepository,
      NotificationEventRepository notificationEventRepository,
      AppUserRepository appUserRepository,
      AccessQueryService accessQueryService,
      Clock clock) {
    this.customerRepository = customerRepository;
    this.notificationEventRepository = notificationEventRepository;
    this.appUserRepository = appUserRepository;
    this.accessQueryService = accessQueryService;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public CustomerMergePreview preview(AuthPrincipal principal, UUID survivorId, UUID duplicateId) {
    UUID tenantId = requireCrmAccess(principal);
    CustomerPair pair = requireMergePair(tenantId, survivorId, duplicateId);
    return toPreview(pair.survivor(), pair.duplicate());
  }

  @Transactional
  public CustomerView execute(
      AuthPrincipal principal, UUID survivorId, UUID duplicateId, Map<String, String> resolutions) {
    UUID tenantId = requireCrmAccess(principal);
    CustomerPair pair = requireMergePair(tenantId, survivorId, duplicateId);
    List<CustomerMergeFields.FieldDiff> diffs =
        CustomerMergeFields.diff(pair.survivor(), pair.duplicate());
    List<String> conflicts = CustomerMergeFields.conflicts(diffs);
    Map<String, CustomerMergeFields.Side> parsed = parseResolutions(resolutions);
    for (String conflict : conflicts) {
      if (!parsed.containsKey(conflict)) {
        throw new ApiException(
            HttpStatus.UNPROCESSABLE_ENTITY, MERGE_CONFLICTS_CODE, MERGE_CONFLICTS_MESSAGE);
      }
    }

    Map<String, String> values;
    try {
      values = CustomerMergeFields.resolveValues(pair.survivor(), pair.duplicate(), parsed);
    } catch (IllegalArgumentException ex) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY, MERGE_CONFLICTS_CODE, MERGE_CONFLICTS_MESSAGE);
    }

    String phone = requirePhone(values.get("phone"));
    assertPhoneAvailable(tenantId, phone, pair.survivor().getId(), pair.duplicate().getId());

    Instant now = clock.instant();
    Customer survivor = pair.survivor();
    survivor.setName(requireName(values.get("name")));
    survivor.setPhone(phone);
    survivor.setEmail(blankToNull(values.get("email")));
    survivor.setDateOfBirth(parseDate(values.get("dateOfBirth")));
    survivor.setGender(blankToNull(values.get("gender")));
    survivor.setAddress(blankToNull(values.get("address")));
    survivor.setBloodGroup(blankToNull(values.get("bloodGroup")));
    survivor.setAllergies(blankToNull(values.get("allergies")));
    survivor.setChronicConditions(blankToNull(values.get("chronicConditions")));
    survivor.setUpdatedAt(now);
    customerRepository.save(survivor);

    notificationEventRepository.repointCustomerId(
        survivor.getId(), pair.duplicate().getId(), tenantId);

    Customer duplicate = pair.duplicate();
    duplicate.setDeletedAt(now);
    duplicate.setMergedIntoId(survivor.getId());
    duplicate.setMergedAt(now);
    duplicate.setMergedByUserId(principal.userId());
    duplicate.setUpdatedAt(now);
    customerRepository.save(duplicate);

    return toView(survivor);
  }

  private CustomerMergePreview toPreview(Customer survivor, Customer duplicate) {
    List<CustomerMergeFields.FieldDiff> diffs = CustomerMergeFields.diff(survivor, duplicate);
    List<CustomerMergePreview.CustomerMergeFieldView> fields =
        diffs.stream()
            .map(
                diff ->
                    new CustomerMergePreview.CustomerMergeFieldView(
                        diff.field(),
                        diff.status().name(),
                        diff.survivorValue(),
                        diff.duplicateValue()))
            .toList();
    long notificationEvents =
        notificationEventRepository.countByCustomerIdAndTenantId(
            duplicate.getId(), survivor.getTenantId());
    return new CustomerMergePreview(
        "PREVIEW",
        toView(survivor),
        toView(duplicate),
        fields,
        CustomerMergeFields.conflicts(diffs),
        new CustomerMergePreview.CustomerMergeLinkedRecords(notificationEvents));
  }

  private CustomerPair requireMergePair(UUID tenantId, UUID survivorId, UUID duplicateId) {
    if (survivorId == null || duplicateId == null || survivorId.equals(duplicateId)) {
      throw stale("Choose two different customer profiles to merge.");
    }
    Customer survivor = requireActiveCustomer(survivorId, tenantId);
    Customer duplicate = requireActiveCustomer(duplicateId, tenantId);
    if (survivor.getMergedIntoId() != null || duplicate.getMergedIntoId() != null) {
      throw stale("One of these profiles was already merged.");
    }
    return new CustomerPair(survivor, duplicate);
  }

  private Customer requireActiveCustomer(UUID id, UUID tenantId) {
    return customerRepository
        .findByIdAndTenantId(id, tenantId)
        .map(
            customer -> {
              if (customer.getDeletedAt() != null || customer.getMergedIntoId() != null) {
                throw stale("Customer was already merged or deactivated.");
              }
              return customer;
            })
        .orElseThrow(
            () -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Customer was not found"));
  }

  private Map<String, CustomerMergeFields.Side> parseResolutions(Map<String, String> resolutions) {
    Map<String, CustomerMergeFields.Side> parsed = new HashMap<>();
    if (resolutions == null) {
      return parsed;
    }
    for (Map.Entry<String, String> entry : resolutions.entrySet()) {
      if (entry.getKey() == null) {
        continue;
      }
      CustomerMergeFields.Side side = CustomerMergeFields.parseSide(entry.getValue());
      if (side == null) {
        throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
      }
      parsed.put(entry.getKey(), side);
    }
    return parsed;
  }

  private void assertPhoneAvailable(
      UUID tenantId, String phone, UUID survivorId, UUID duplicateId) {
    customerRepository
        .findByTenantIdAndPhoneAndDeletedAtIsNull(tenantId, phone)
        .ifPresent(
            existing -> {
              if (!existing.getId().equals(survivorId) && !existing.getId().equals(duplicateId)) {
                throw new ApiException(
                    HttpStatus.CONFLICT,
                    CustomerService.PHONE_TAKEN_CODE,
                    CustomerService.PHONE_TAKEN_MESSAGE);
              }
            });
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
            .orElseThrow(CustomerMergeService::forbidden);
    if (!accessQueryService.effectiveModules(user).contains(ModuleCode.CRM)) {
      throw forbidden();
    }
    return principal.tenantId();
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

  private static LocalDate parseDate(String value) {
    if (value == null || value.isBlank()) {
      return null;
    }
    return LocalDate.parse(value.trim());
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

  private static ApiException stale(String message) {
    return new ApiException(HttpStatus.CONFLICT, "STALE_STATE", message);
  }

  private static ApiException forbidden() {
    return new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Forbidden");
  }

  private record CustomerPair(Customer survivor, Customer duplicate) {}
}
