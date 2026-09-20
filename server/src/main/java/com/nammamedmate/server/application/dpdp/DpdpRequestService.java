package com.nammamedmate.server.application.dpdp;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nammamedmate.server.application.audit.AuditRecordCommand;
import com.nammamedmate.server.application.audit.AuditService;
import com.nammamedmate.server.application.auth.SavedLoginService;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.Customer;
import com.nammamedmate.server.domain.Doctor;
import com.nammamedmate.server.domain.DpdpCategory;
import com.nammamedmate.server.domain.DpdpPolicy;
import com.nammamedmate.server.domain.DpdpPrincipalType;
import com.nammamedmate.server.domain.DpdpRequest;
import com.nammamedmate.server.domain.DpdpRequestStatus;
import com.nammamedmate.server.domain.DpdpRequestType;
import com.nammamedmate.server.domain.KycDocument;
import com.nammamedmate.server.domain.SalesInvoice;
import com.nammamedmate.server.domain.SalesInvoiceStatus;
import com.nammamedmate.server.domain.Supplier;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.CustomerRepository;
import com.nammamedmate.server.persistence.DoctorRepository;
import com.nammamedmate.server.persistence.DpdpRequestRepository;
import com.nammamedmate.server.persistence.KycDocumentRepository;
import com.nammamedmate.server.persistence.SalesInvoiceRepository;
import com.nammamedmate.server.persistence.SupplierRepository;
import com.nammamedmate.server.persistence.UserSessionRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.time.Clock;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DpdpRequestService {

  private final DpdpRequestRepository requests;
  private final CustomerRepository customers;
  private final DoctorRepository doctors;
  private final SupplierRepository suppliers;
  private final AppUserRepository users;
  private final SalesInvoiceRepository invoices;
  private final KycDocumentRepository kycDocuments;
  private final UserSessionRepository sessions;
  private final SavedLoginService savedLogins;
  private final AuditService auditService;
  private final ObjectMapper objectMapper;
  private final Clock clock;

  public DpdpRequestService(
      DpdpRequestRepository requests,
      CustomerRepository customers,
      DoctorRepository doctors,
      SupplierRepository suppliers,
      AppUserRepository users,
      SalesInvoiceRepository invoices,
      KycDocumentRepository kycDocuments,
      UserSessionRepository sessions,
      SavedLoginService savedLogins,
      AuditService auditService,
      ObjectMapper objectMapper,
      Clock clock) {
    this.requests = requests;
    this.customers = customers;
    this.doctors = doctors;
    this.suppliers = suppliers;
    this.users = users;
    this.invoices = invoices;
    this.kycDocuments = kycDocuments;
    this.sessions = sessions;
    this.savedLogins = savedLogins;
    this.auditService = auditService;
    this.objectMapper = objectMapper;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public List<DpdpCategory> matrix(AuthPrincipal principal, boolean platform) {
    requireActor(principal, platform);
    return DpdpPolicy.matrix();
  }

  @Transactional(readOnly = true)
  public List<DpdpRequestView> list(AuthPrincipal principal, boolean platform) {
    AppUser actor = requireActor(principal, platform);
    List<DpdpRequest> rows =
        platform
            ? requests.findByPrincipalTypeInOrderByCreatedAtDesc(DpdpPolicy.PLATFORM_TYPES)
            : requests.findByTenantIdOrderByCreatedAtDesc(actor.getTenantId());
    return rows.stream().map(DpdpRequestService::toView).toList();
  }

  @Transactional
  public DpdpRequestView create(
      AuthPrincipal principal,
      boolean platform,
      DpdpPrincipalType type,
      DpdpRequestType requestType,
      UUID principalId,
      String submittedName,
      String submittedPhone,
      String notes) {
    AppUser actor = requireActor(principal, platform);
    if (type == null || requestType == null) {
      throw validation("Principal and request type are required");
    }
    if (platform != DpdpPolicy.PLATFORM_TYPES.contains(type)) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "PRINCIPAL_SCOPE", "Wrong desk");
    }
    Instant now = Instant.now(clock);
    DpdpRequest row = new DpdpRequest();
    row.setId(UUID.randomUUID());
    row.setPrincipalType(type);
    row.setPrincipalId(principalId);
    row.setRequestType(requestType);
    row.setStatus(DpdpRequestStatus.RECEIVED);
    row.setSubmittedName(trim(submittedName, 200));
    row.setSubmittedPhone(trim(submittedPhone, 32));
    row.setNotes(trim(notes, 500));
    row.setCreatedBy(actor.getId());
    row.setVersion(1);
    row.setCreatedAt(now);
    row.setUpdatedAt(now);
    if (!platform) {
      row.setTenantId(actor.getTenantId());
    } else if (type == DpdpPrincipalType.OWNER_KYC) {
      if (principalId == null) {
        throw validation("Tenant id is required for OWNER_KYC");
      }
      row.setTenantId(principalId);
    }
    requests.save(row);
    audit(actor, row, "RECEIVED");
    return toView(row);
  }

  @Transactional
  public DpdpRequestView accept(
      AuthPrincipal principal, boolean platform, UUID id, String identityMethod) {
    AppUser actor = requireActor(principal, platform);
    if (identityMethod == null || identityMethod.isBlank()) {
      throw validation("Say how you checked who they are");
    }
    DpdpRequest row = lockVisible(id, actor, platform);
    if (row.getStatus() != DpdpRequestStatus.RECEIVED) {
      throw new ApiException(HttpStatus.CONFLICT, "STALE_STATE", "Already accepted or closed");
    }
    Instant now = Instant.now(clock);
    if (row.getPrincipalId() == null && row.getPrincipalType() == DpdpPrincipalType.CUSTOMER) {
      row.setPrincipalId(bindOrCreateCustomer(row));
    }
    row.setIdentityMethod(trim(identityMethod, 500));
    row.setIdentityAttestedBy(actor.getId());
    row.setIdentityAttestedAt(now);
    row.setAcceptedAt(now);
    row.setDeadlineAt(now.plus(DpdpPolicy.DECISION_DEADLINE));
    row.setStatus(DpdpRequestStatus.ACCEPTED);
    row.setUpdatedAt(now);
    row.setVersion(row.getVersion() + 1);
    audit(actor, row, "ACCEPTED");
    return toView(row);
  }

  @Transactional
  public DpdpRequestView decide(
      AuthPrincipal principal,
      boolean platform,
      UUID id,
      String decision,
      String decisionReason,
      Map<String, String> correction) {
    AppUser actor = requireActor(principal, platform);
    DpdpRequest row = lockVisible(id, actor, platform);
    if (row.getStatus() != DpdpRequestStatus.ACCEPTED) {
      throw new ApiException(HttpStatus.CONFLICT, "STALE_STATE", "Accept the request first");
    }
    if (!"FULFILLED".equals(decision) && !"REFUSED".equals(decision)) {
      throw validation("Decision must be FULFILLED or REFUSED");
    }
    Instant now = Instant.now(clock);
    if ("REFUSED".equals(decision)) {
      row.setStatus(DpdpRequestStatus.REFUSED);
      row.setDecision("REFUSED");
      row.setDecisionReason(trim(decisionReason, 500));
    } else {
      fulfill(row, correction);
      row.setStatus(DpdpRequestStatus.FULFILLED);
      row.setDecision("FULFILLED");
      String reason = trim(decisionReason, 500);
      if (reason != null) {
        row.setDecisionReason(reason);
      } else if (row.getDecisionReason() == null && row.isLegalRetention()) {
        row.setDecisionReason("LEGAL_RETENTION");
      }
    }
    row.setUpdatedAt(now);
    row.setVersion(row.getVersion() + 1);
    audit(actor, row, row.getDecision());
    return toView(row);
  }

  @Transactional(readOnly = true)
  public DpdpRequestView get(AuthPrincipal principal, boolean platform, UUID id) {
    AppUser actor = requireActor(principal, platform);
    return toView(visible(id, actor, platform));
  }

  private void fulfill(DpdpRequest row, Map<String, String> correction) {
    switch (row.getRequestType()) {
      case ACCESS, EXPORT -> row.setExportJson(writeJson(exportPack(row)));
      case CORRECTION -> applyCorrection(row, correction);
      case ERASURE -> applyErasure(row);
    }
  }

  private void applyCorrection(DpdpRequest row, Map<String, String> correction) {
    if (correction == null || correction.isEmpty()) {
      throw validation("Correction fields are required");
    }
    switch (row.getPrincipalType()) {
      case CUSTOMER -> {
        Customer customer = requireCustomer(row);
        if (correction.containsKey("name")) {
          customer.setName(required(correction.get("name"), "name"));
        }
        if (correction.containsKey("phone")) {
          customer.setPhone(required(correction.get("phone"), "phone"));
        }
        if (correction.containsKey("email")) {
          customer.setEmail(emptyToNull(correction.get("email")));
        }
        if (correction.containsKey("address")) {
          customer.setAddress(emptyToNull(correction.get("address")));
        }
        customer.setUpdatedAt(Instant.now(clock));
      }
      case DOCTOR -> {
        Doctor doctor = requireDoctor(row);
        if (correction.containsKey("name")) {
          doctor.setName(required(correction.get("name"), "name"));
        }
        if (correction.containsKey("phone")) {
          doctor.setPhone(emptyToNull(correction.get("phone")));
        }
        doctor.setUpdatedAt(Instant.now(clock));
      }
      case SUPPLIER -> {
        Supplier supplier = requireSupplier(row);
        if (correction.containsKey("contactPersonName")) {
          supplier.setContactPersonName(
              required(correction.get("contactPersonName"), "contactPersonName"));
        }
        if (correction.containsKey("phone")) {
          supplier.setPhone(required(correction.get("phone"), "phone"));
        }
        if (correction.containsKey("email")) {
          supplier.setEmail(emptyToNull(correction.get("email")));
        }
        supplier.setUpdatedAt(Instant.now(clock));
      }
      case STAFF, MASTER, OWNER_KYC -> {
        AppUser user = requireUser(row);
        if (correction.containsKey("displayName")) {
          user.setDisplayName(required(correction.get("displayName"), "displayName"));
        }
        if (correction.containsKey("phone")) {
          user.setPhone(emptyToNull(correction.get("phone")));
        }
        user.setUpdatedAt(Instant.now(clock));
      }
    }
  }

  private void applyErasure(DpdpRequest row) {
    switch (row.getPrincipalType()) {
      case CUSTOMER -> eraseCustomer(row);
      case DOCTOR -> eraseDoctor(row);
      case SUPPLIER -> eraseSupplier(row);
      case STAFF, MASTER, OWNER_KYC -> eraseUser(row);
    }
  }

  private void eraseCustomer(DpdpRequest row) {
    Customer customer = requireCustomer(row);
    String originalName = customer.getName();
    String originalPhone = customer.getPhone();
    boolean legal =
        invoices.existsByTenantIdAndCustomerIdAndStatus(
            row.getTenantId(), customer.getId(), SalesInvoiceStatus.COMPLETED);
    customer.setEmail(null);
    customer.setDateOfBirth(null);
    customer.setGender(null);
    customer.setAddress(null);
    customer.setBloodGroup(null);
    customer.setAllergies(null);
    customer.setChronicConditions(null);
    if (legal) {
      customer.setName(originalName);
      customer.setPhone(originalPhone);
      row.setLegalRetention(true);
      if (row.getDecisionReason() == null || row.getDecisionReason().isBlank()) {
        row.setDecisionReason("LEGAL_RETENTION");
      }
    } else {
      customer.setName(DpdpPolicy.ERASED_NAME);
      customer.setPhone(DpdpPolicy.erasedPhone(customer.getId()));
    }
    customer.setUpdatedAt(Instant.now(clock));
  }

  private void eraseDoctor(DpdpRequest row) {
    Doctor doctor = requireDoctor(row);
    boolean legal =
        invoices.existsByTenantIdAndDoctorIdAndStatus(
            row.getTenantId(), doctor.getId(), SalesInvoiceStatus.COMPLETED);
    doctor.setPhone(null);
    doctor.setNotes(null);
    if (!legal) {
      doctor.setName(DpdpPolicy.ERASED_NAME);
    } else {
      row.setLegalRetention(true);
    }
    doctor.setUpdatedAt(Instant.now(clock));
  }

  private void eraseSupplier(DpdpRequest row) {
    Supplier supplier = requireSupplier(row);
    supplier.setContactPersonName(DpdpPolicy.ERASED_NAME);
    supplier.setPhone(DpdpPolicy.erasedPhone(supplier.getId()));
    supplier.setEmail(null);
    supplier.setAlternatePhone(null);
    supplier.setUpdatedAt(Instant.now(clock));
  }

  private void eraseUser(DpdpRequest row) {
    AppUser user = requireUser(row);
    Instant now = Instant.now(clock);
    user.setPhone(null);
    user.setActive(false);
    user.setStatus(UserAccountStatus.TERMINATED);
    user.setDeletedAt(now);
    user.setUpdatedAt(now);
    sessions.revokeActiveSessions(user.getId(), now);
    savedLogins.revokeAllForUser(user.getId());
  }

  private Map<String, Object> exportPack(DpdpRequest row) {
    Map<String, Object> pack = new LinkedHashMap<>();
    pack.put("principalType", row.getPrincipalType().name());
    pack.put("principalId", row.getPrincipalId());
    switch (row.getPrincipalType()) {
      case CUSTOMER -> {
        Customer customer = requireCustomer(row);
        pack.put(
            "profile",
            profile(
                Map.of(
                    "name", customer.getName(),
                    "phone", customer.getPhone(),
                    "email", nvl(customer.getEmail()),
                    "dateOfBirth", nvl(customer.getDateOfBirth()),
                    "gender", nvl(customer.getGender()),
                    "address", nvl(customer.getAddress()),
                    "bloodGroup", nvl(customer.getBloodGroup()),
                    "allergies", nvl(customer.getAllergies()),
                    "chronicConditions", nvl(customer.getChronicConditions()))));
        pack.put(
            "relatedInvoiceIds",
            invoices
                .findTop40ByTenantIdAndStatusAndCustomerIdOrderByCompletedAtDesc(
                    row.getTenantId(), SalesInvoiceStatus.COMPLETED, customer.getId())
                .stream()
                .map(SalesInvoice::getId)
                .toList());
      }
      case DOCTOR -> {
        Doctor doctor = requireDoctor(row);
        pack.put(
            "profile",
            profile(
                Map.of(
                    "name", doctor.getName(),
                    "phone", nvl(doctor.getPhone()),
                    "registrationNumber", nvl(doctor.getRegistrationNumber()))));
        pack.put("relatedInvoiceIds", List.of());
      }
      case SUPPLIER -> {
        Supplier supplier = requireSupplier(row);
        pack.put(
            "profile",
            profile(
                Map.of(
                    "contactPersonName", supplier.getContactPersonName(),
                    "phone", supplier.getPhone(),
                    "email", nvl(supplier.getEmail()))));
        pack.put("relatedInvoiceIds", List.of());
      }
      case STAFF, MASTER, OWNER_KYC -> {
        AppUser user = requireUser(row);
        pack.put(
            "profile",
            profile(
                Map.of(
                    "displayName", user.getDisplayName(),
                    "email", user.getEmail(),
                    "phone", nvl(user.getPhone()),
                    "role", user.getRole().name())));
        if (row.getPrincipalType() == DpdpPrincipalType.OWNER_KYC && row.getTenantId() != null) {
          pack.put(
              "kycDocumentIds",
              kycDocuments.findByTenantIdOrderByCreatedAtAsc(row.getTenantId()).stream()
                  .map(KycDocument::getId)
                  .toList());
        }
        pack.put("relatedInvoiceIds", List.of());
      }
    }
    return pack;
  }

  private UUID bindOrCreateCustomer(DpdpRequest row) {
    if (row.getSubmittedPhone() != null && !row.getSubmittedPhone().isBlank()) {
      return customers
          .findByTenantIdAndPhoneAndDeletedAtIsNull(
              row.getTenantId(), row.getSubmittedPhone().trim())
          .map(Customer::getId)
          .orElseGet(() -> createWalkIn(row));
    }
    return createWalkIn(row);
  }

  private UUID createWalkIn(DpdpRequest row) {
    if (row.getSubmittedName() == null
        || row.getSubmittedName().isBlank()
        || row.getSubmittedPhone() == null
        || row.getSubmittedPhone().isBlank()) {
      throw validation("Name and phone are required to open a walk-in file");
    }
    Customer customer = new Customer();
    customer.setId(UUID.randomUUID());
    customer.setTenantId(row.getTenantId());
    customer.setName(row.getSubmittedName().trim());
    customer.setPhone(row.getSubmittedPhone().trim());
    Instant now = Instant.now(clock);
    customer.setCreatedAt(now);
    customer.setUpdatedAt(now);
    customers.save(customer);
    return customer.getId();
  }

  private Customer requireCustomer(DpdpRequest row) {
    if (row.getPrincipalId() == null) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY, "PRINCIPAL_REQUIRED", "Link a person first");
    }
    return customers
        .findByIdAndTenantIdAndDeletedAtIsNull(row.getPrincipalId(), row.getTenantId())
        .orElseThrow(DpdpRequestService::notFound);
  }

  private Doctor requireDoctor(DpdpRequest row) {
    return doctors
        .findByIdAndTenantIdAndDeletedAtIsNull(row.getPrincipalId(), row.getTenantId())
        .orElseThrow(DpdpRequestService::notFound);
  }

  private Supplier requireSupplier(DpdpRequest row) {
    return suppliers
        .findByIdAndTenantId(row.getPrincipalId(), row.getTenantId())
        .orElseThrow(DpdpRequestService::notFound);
  }

  private AppUser requireUser(DpdpRequest row) {
    if (row.getPrincipalType() == DpdpPrincipalType.OWNER_KYC) {
      return users.findByTenantIdAndDeletedAtIsNullOrderByCreatedAtAsc(row.getTenantId()).stream()
          .filter(item -> item.getRole() == AppUserRole.pharmacy_owner)
          .findFirst()
          .orElseThrow(DpdpRequestService::notFound);
    }
    if (row.getPrincipalId() == null) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY, "PRINCIPAL_REQUIRED", "Link a person first");
    }
    AppUser user = users.findById(row.getPrincipalId()).orElseThrow(DpdpRequestService::notFound);
    if (row.getPrincipalType() == DpdpPrincipalType.MASTER) {
      if (user.getRole() != AppUserRole.admin_super) {
        throw notFound();
      }
    } else if (row.getPrincipalType() == DpdpPrincipalType.STAFF) {
      if (user.getTenantId() == null || !user.getTenantId().equals(row.getTenantId())) {
        throw notFound();
      }
    }
    return user;
  }

  private DpdpRequest lockVisible(UUID id, AppUser actor, boolean platform) {
    DpdpRequest row = requests.lockById(id).orElseThrow(DpdpRequestService::notFound);
    assertVisible(row, actor, platform);
    return row;
  }

  private DpdpRequest visible(UUID id, AppUser actor, boolean platform) {
    DpdpRequest row = requests.findById(id).orElseThrow(DpdpRequestService::notFound);
    assertVisible(row, actor, platform);
    return row;
  }

  private static void assertVisible(DpdpRequest row, AppUser actor, boolean platform) {
    if (platform) {
      if (!DpdpPolicy.PLATFORM_TYPES.contains(row.getPrincipalType())) {
        throw notFound();
      }
      return;
    }
    if (row.getTenantId() == null || !row.getTenantId().equals(actor.getTenantId())) {
      throw notFound();
    }
    if (!DpdpPolicy.TENANT_TYPES.contains(row.getPrincipalType())) {
      throw notFound();
    }
  }

  private AppUser requireActor(AuthPrincipal principal, boolean platform) {
    if (principal == null || principal.userId() == null) {
      throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Authentication required");
    }
    UUID actorId = platform ? principal.hqUserId() : principal.userId();
    AppUser actor =
        users
            .findById(actorId)
            .filter(user -> user.getDeletedAt() == null)
            .orElseThrow(
                () ->
                    new ApiException(
                        HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Authentication required"));
    if (platform) {
      if (actor.getRole() != AppUserRole.admin_super) {
        throw forbidden();
      }
    } else if (actor.getRole() != AppUserRole.pharmacy_owner) {
      throw forbidden();
    }
    return actor;
  }

  private void audit(AppUser actor, DpdpRequest row, String outcome) {
    auditService.record(
        new AuditRecordCommand(
            actor.getId(),
            row.getTenantId(),
            null,
            DpdpPolicy.AUDIT_ACTION,
            AuditService.OUTCOME_SUCCESS,
            null,
            null,
            null,
            null,
            "{\"requestId\":\"" + row.getId() + "\",\"outcome\":\"" + outcome + "\"}"));
  }

  private String writeJson(Map<String, Object> pack) {
    try {
      String json = objectMapper.writeValueAsString(pack);
      String lower = json.toLowerCase();
      if (lower.contains("password") || lower.contains("\"pin\"") || lower.contains("token")) {
        throw validation("Export must not contain secrets");
      }
      return json;
    } catch (JsonProcessingException ex) {
      throw new ApiException(
          HttpStatus.INTERNAL_SERVER_ERROR, "EXPORT_FAILED", "Could not build export");
    }
  }

  private static Map<String, Object> profile(Map<String, Object> fields) {
    return new LinkedHashMap<>(fields);
  }

  private static String nvl(Object value) {
    return value == null ? "" : String.valueOf(value);
  }

  private static String required(String value, String field) {
    if (value == null || value.isBlank()) {
      throw validation(field + " is required");
    }
    return value.trim();
  }

  private static String emptyToNull(String value) {
    if (value == null || value.isBlank()) {
      return null;
    }
    return value.trim();
  }

  private static String trim(String value, int max) {
    if (value == null || value.isBlank()) {
      return null;
    }
    String trimmed = value.trim();
    return trimmed.length() <= max ? trimmed : trimmed.substring(0, max);
  }

  private static ApiException validation(String message) {
    return new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", message);
  }

  private static ApiException forbidden() {
    return new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Access denied");
  }

  private static ApiException notFound() {
    return new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Not found");
  }

  private static DpdpRequestView toView(DpdpRequest row) {
    return new DpdpRequestView(
        row.getId(),
        row.getTenantId(),
        row.getPrincipalType(),
        row.getPrincipalId(),
        row.getRequestType(),
        row.getStatus(),
        row.getSubmittedName(),
        row.getSubmittedPhone(),
        row.getNotes(),
        row.getIdentityMethod(),
        row.getIdentityAttestedBy(),
        row.getIdentityAttestedAt(),
        row.getAcceptedAt(),
        row.getDeadlineAt(),
        row.getDecision(),
        row.getDecisionReason(),
        row.isLegalRetention(),
        row.getExportJson(),
        row.getCreatedBy(),
        row.getVersion(),
        row.getCreatedAt());
  }
}
