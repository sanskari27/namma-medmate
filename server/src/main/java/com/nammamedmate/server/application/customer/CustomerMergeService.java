package com.nammamedmate.server.application.customer;

import com.nammamedmate.server.application.access.AccessQueryService;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.CampaignRecipient;
import com.nammamedmate.server.domain.Customer;
import com.nammamedmate.server.domain.CustomerCreditAccount;
import com.nammamedmate.server.domain.CustomerFamilyMember;
import com.nammamedmate.server.domain.CustomerLoyaltyAccount;
import com.nammamedmate.server.domain.CustomerRefillSchedule;
import com.nammamedmate.server.domain.CustomerTagAssignment;
import com.nammamedmate.server.domain.ModuleCode;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.CampaignRecipientRepository;
import com.nammamedmate.server.persistence.CustomerCreditAccountRepository;
import com.nammamedmate.server.persistence.CustomerCreditLedgerEntryRepository;
import com.nammamedmate.server.persistence.CustomerFamilyMemberRepository;
import com.nammamedmate.server.persistence.CustomerHistoryFactRepository;
import com.nammamedmate.server.persistence.CustomerLoyaltyAccountRepository;
import com.nammamedmate.server.persistence.CustomerLoyaltyLedgerEntryRepository;
import com.nammamedmate.server.persistence.CustomerRefillScheduleRepository;
import com.nammamedmate.server.persistence.CustomerRepository;
import com.nammamedmate.server.persistence.CustomerTagAssignmentRepository;
import com.nammamedmate.server.persistence.NotificationEventRepository;
import com.nammamedmate.server.persistence.PrescriptionReferenceRepository;
import com.nammamedmate.server.persistence.SalesInvoiceRepository;
import com.nammamedmate.server.persistence.SalesPrescriptionFulfillmentRepository;
import com.nammamedmate.server.persistence.SalesReturnRepository;
import com.nammamedmate.server.persistence.WhatsAppMessageRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
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
  private final SalesInvoiceRepository salesInvoiceRepository;
  private final SalesReturnRepository salesReturnRepository;
  private final PrescriptionReferenceRepository prescriptionReferenceRepository;
  private final SalesPrescriptionFulfillmentRepository salesPrescriptionFulfillmentRepository;
  private final CustomerHistoryFactRepository customerHistoryFactRepository;
  private final CustomerCreditLedgerEntryRepository customerCreditLedgerEntryRepository;
  private final CustomerLoyaltyLedgerEntryRepository customerLoyaltyLedgerEntryRepository;
  private final CustomerRefillScheduleRepository customerRefillScheduleRepository;
  private final WhatsAppMessageRepository whatsAppMessageRepository;
  private final CampaignRecipientRepository campaignRecipientRepository;
  private final CustomerTagAssignmentRepository customerTagAssignmentRepository;
  private final CustomerFamilyMemberRepository customerFamilyMemberRepository;
  private final CustomerCreditAccountRepository customerCreditAccountRepository;
  private final CustomerLoyaltyAccountRepository customerLoyaltyAccountRepository;
  private final AppUserRepository appUserRepository;
  private final AccessQueryService accessQueryService;
  private final Clock clock;

  public CustomerMergeService(
      CustomerRepository customerRepository,
      NotificationEventRepository notificationEventRepository,
      SalesInvoiceRepository salesInvoiceRepository,
      SalesReturnRepository salesReturnRepository,
      PrescriptionReferenceRepository prescriptionReferenceRepository,
      SalesPrescriptionFulfillmentRepository salesPrescriptionFulfillmentRepository,
      CustomerHistoryFactRepository customerHistoryFactRepository,
      CustomerCreditLedgerEntryRepository customerCreditLedgerEntryRepository,
      CustomerLoyaltyLedgerEntryRepository customerLoyaltyLedgerEntryRepository,
      CustomerRefillScheduleRepository customerRefillScheduleRepository,
      WhatsAppMessageRepository whatsAppMessageRepository,
      CampaignRecipientRepository campaignRecipientRepository,
      CustomerTagAssignmentRepository customerTagAssignmentRepository,
      CustomerFamilyMemberRepository customerFamilyMemberRepository,
      CustomerCreditAccountRepository customerCreditAccountRepository,
      CustomerLoyaltyAccountRepository customerLoyaltyAccountRepository,
      AppUserRepository appUserRepository,
      AccessQueryService accessQueryService,
      Clock clock) {
    this.customerRepository = customerRepository;
    this.notificationEventRepository = notificationEventRepository;
    this.salesInvoiceRepository = salesInvoiceRepository;
    this.salesReturnRepository = salesReturnRepository;
    this.prescriptionReferenceRepository = prescriptionReferenceRepository;
    this.salesPrescriptionFulfillmentRepository = salesPrescriptionFulfillmentRepository;
    this.customerHistoryFactRepository = customerHistoryFactRepository;
    this.customerCreditLedgerEntryRepository = customerCreditLedgerEntryRepository;
    this.customerLoyaltyLedgerEntryRepository = customerLoyaltyLedgerEntryRepository;
    this.customerRefillScheduleRepository = customerRefillScheduleRepository;
    this.whatsAppMessageRepository = whatsAppMessageRepository;
    this.campaignRecipientRepository = campaignRecipientRepository;
    this.customerTagAssignmentRepository = customerTagAssignmentRepository;
    this.customerFamilyMemberRepository = customerFamilyMemberRepository;
    this.customerCreditAccountRepository = customerCreditAccountRepository;
    this.customerLoyaltyAccountRepository = customerLoyaltyAccountRepository;
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

    moveReferences(tenantId, survivor.getId(), pair.duplicate().getId());

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
    UUID tenantId = survivor.getTenantId();
    UUID duplicateId = duplicate.getId();
    return new CustomerMergePreview(
        "PREVIEW",
        toView(survivor),
        toView(duplicate),
        fields,
        CustomerMergeFields.conflicts(diffs),
        new CustomerMergePreview.CustomerMergeLinkedRecords(
            notificationEventRepository.countByCustomerIdAndTenantId(duplicateId, tenantId),
            salesInvoiceRepository.countByTenantIdAndCustomerId(tenantId, duplicateId),
            customerCreditLedgerEntryRepository.countByTenantIdAndCustomerId(tenantId, duplicateId),
            customerLoyaltyLedgerEntryRepository.countByTenantIdAndCustomerId(
                tenantId, duplicateId),
            customerHistoryFactRepository.countByTenantIdAndCustomerId(tenantId, duplicateId),
            customerRefillScheduleRepository.countByTenantIdAndCustomerId(tenantId, duplicateId),
            customerTagAssignmentRepository
                .findAllByTenantIdAndCustomerId(tenantId, duplicateId)
                .size(),
            customerFamilyMemberRepository
                    .findByTenantIdAndCustomerId(tenantId, duplicateId)
                    .isPresent()
                ? 1L
                : 0L));
  }

  private void moveReferences(UUID tenantId, UUID survivorId, UUID duplicateId) {
    notificationEventRepository.repointCustomerId(survivorId, duplicateId, tenantId);
    salesInvoiceRepository.repointCustomerId(survivorId, duplicateId, tenantId);
    salesReturnRepository.repointCustomerId(survivorId, duplicateId, tenantId);
    prescriptionReferenceRepository.repointCustomerId(survivorId, duplicateId, tenantId);
    salesPrescriptionFulfillmentRepository.repointCustomerId(survivorId, duplicateId, tenantId);
    customerHistoryFactRepository.repointCustomerId(survivorId, duplicateId, tenantId);
    customerCreditLedgerEntryRepository.repointCustomerId(survivorId, duplicateId, tenantId);
    customerLoyaltyLedgerEntryRepository.repointCustomerId(survivorId, duplicateId, tenantId);
    whatsAppMessageRepository.repointCustomerId(survivorId, duplicateId, tenantId);
    moveRefills(tenantId, survivorId, duplicateId);
    moveTags(tenantId, survivorId, duplicateId);
    moveFamily(tenantId, survivorId, duplicateId);
    moveCampaignRecipients(tenantId, survivorId, duplicateId);
    moveCreditAccount(tenantId, survivorId, duplicateId);
    moveLoyaltyAccount(tenantId, survivorId, duplicateId);
  }

  private void moveRefills(UUID tenantId, UUID survivorId, UUID duplicateId) {
    Set<String> survivorMedicines = new HashSet<>();
    for (CustomerRefillSchedule row :
        customerRefillScheduleRepository
            .findAllByTenantIdAndCustomerIdOrderByNextDueOnAscMedicineNameAsc(
                tenantId, survivorId)) {
      survivorMedicines.add(row.getMedicineName().toLowerCase());
    }
    for (CustomerRefillSchedule row :
        customerRefillScheduleRepository
            .findAllByTenantIdAndCustomerIdOrderByNextDueOnAscMedicineNameAsc(
                tenantId, duplicateId)) {
      if (survivorMedicines.contains(row.getMedicineName().toLowerCase())) {
        customerRefillScheduleRepository.delete(row);
      } else {
        row.setCustomerId(survivorId);
        customerRefillScheduleRepository.save(row);
      }
    }
  }

  private void moveTags(UUID tenantId, UUID survivorId, UUID duplicateId) {
    Set<UUID> survivorTags = new HashSet<>();
    for (CustomerTagAssignment row :
        customerTagAssignmentRepository.findAllByTenantIdAndCustomerId(tenantId, survivorId)) {
      survivorTags.add(row.getTagId());
    }
    for (CustomerTagAssignment row :
        List.copyOf(
            customerTagAssignmentRepository.findAllByTenantIdAndCustomerId(
                tenantId, duplicateId))) {
      customerTagAssignmentRepository.delete(row);
      customerTagAssignmentRepository.flush();
      if (survivorTags.contains(row.getTagId())) {
        continue;
      }
      CustomerTagAssignment moved = new CustomerTagAssignment();
      moved.setTenantId(tenantId);
      moved.setCustomerId(survivorId);
      moved.setTagId(row.getTagId());
      moved.setCreatedAt(row.getCreatedAt());
      customerTagAssignmentRepository.save(moved);
      survivorTags.add(row.getTagId());
    }
  }

  private void moveFamily(UUID tenantId, UUID survivorId, UUID duplicateId) {
    Optional<CustomerFamilyMember> duplicateMember =
        customerFamilyMemberRepository.findByTenantIdAndCustomerId(tenantId, duplicateId);
    if (duplicateMember.isEmpty()) {
      return;
    }
    if (customerFamilyMemberRepository
        .findByTenantIdAndCustomerId(tenantId, survivorId)
        .isPresent()) {
      customerFamilyMemberRepository.delete(duplicateMember.get());
      return;
    }
    CustomerFamilyMember row = duplicateMember.get();
    row.setCustomerId(survivorId);
    customerFamilyMemberRepository.save(row);
  }

  private void moveCampaignRecipients(UUID tenantId, UUID survivorId, UUID duplicateId) {
    Set<UUID> survivorCampaigns = new HashSet<>();
    for (CampaignRecipient row :
        campaignRecipientRepository.findAllByTenantIdAndCustomerId(tenantId, survivorId)) {
      survivorCampaigns.add(row.getCampaignId());
    }
    for (CampaignRecipient row :
        List.copyOf(
            campaignRecipientRepository.findAllByTenantIdAndCustomerId(tenantId, duplicateId))) {
      campaignRecipientRepository.delete(row);
      campaignRecipientRepository.flush();
      if (survivorCampaigns.contains(row.getCampaignId())) {
        continue;
      }
      CampaignRecipient moved = new CampaignRecipient();
      moved.setTenantId(tenantId);
      moved.setCampaignId(row.getCampaignId());
      moved.setCustomerId(survivorId);
      moved.setCreatedAt(row.getCreatedAt());
      campaignRecipientRepository.save(moved);
      survivorCampaigns.add(row.getCampaignId());
    }
  }

  private void moveCreditAccount(UUID tenantId, UUID survivorId, UUID duplicateId) {
    Optional<CustomerCreditAccount> duplicateAccount =
        customerCreditAccountRepository.findByTenantIdAndCustomerId(tenantId, duplicateId);
    if (duplicateAccount.isEmpty()) {
      return;
    }
    Optional<CustomerCreditAccount> survivorAccount =
        customerCreditAccountRepository.findByTenantIdAndCustomerId(tenantId, survivorId);
    CustomerCreditAccount duplicate = duplicateAccount.get();
    if (survivorAccount.isEmpty()) {
      duplicate.setCustomerId(survivorId);
      duplicate.setUpdatedAt(clock.instant());
      customerCreditAccountRepository.save(duplicate);
      return;
    }
    CustomerCreditAccount survivor = survivorAccount.get();
    customerCreditLedgerEntryRepository.repointAccountId(
        survivor.getId(), duplicate.getId(), tenantId);
    survivor.setBalancePaise(survivor.getBalancePaise() + duplicate.getBalancePaise());
    if (survivor.getLimitPaise() == 0L) {
      survivor.setLimitPaise(duplicate.getLimitPaise());
    }
    survivor.setUpdatedAt(clock.instant());
    customerCreditAccountRepository.save(survivor);
    customerCreditAccountRepository.delete(duplicate);
  }

  private void moveLoyaltyAccount(UUID tenantId, UUID survivorId, UUID duplicateId) {
    Optional<CustomerLoyaltyAccount> duplicateAccount =
        customerLoyaltyAccountRepository.findByTenantIdAndCustomerId(tenantId, duplicateId);
    if (duplicateAccount.isEmpty()) {
      return;
    }
    Optional<CustomerLoyaltyAccount> survivorAccount =
        customerLoyaltyAccountRepository.findByTenantIdAndCustomerId(tenantId, survivorId);
    CustomerLoyaltyAccount duplicate = duplicateAccount.get();
    if (survivorAccount.isEmpty()) {
      duplicate.setCustomerId(survivorId);
      duplicate.setUpdatedAt(clock.instant());
      customerLoyaltyAccountRepository.save(duplicate);
      return;
    }
    CustomerLoyaltyAccount survivor = survivorAccount.get();
    customerLoyaltyLedgerEntryRepository.repointAccountId(
        survivor.getId(), duplicate.getId(), tenantId);
    survivor.setBalancePoints(survivor.getBalancePoints() + duplicate.getBalancePoints());
    survivor.setUpdatedAt(clock.instant());
    customerLoyaltyAccountRepository.save(survivor);
    customerLoyaltyAccountRepository.delete(duplicate);
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
