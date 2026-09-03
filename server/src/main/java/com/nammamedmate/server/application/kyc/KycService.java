package com.nammamedmate.server.application.kyc;

import com.nammamedmate.server.application.access.AccessQueryService;
import com.nammamedmate.server.application.notification.NotificationRoutingService;
import com.nammamedmate.server.application.notification.RouteCommand;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.KycDocType;
import com.nammamedmate.server.domain.KycDocument;
import com.nammamedmate.server.domain.KycSubmission;
import com.nammamedmate.server.domain.KycSubmissionStatus;
import com.nammamedmate.server.domain.ModuleCode;
import com.nammamedmate.server.domain.NotificationTrigger;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.SubscriptionStatus;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TenantStatus;
import com.nammamedmate.server.domain.TenantSubscription;
import com.nammamedmate.server.infrastructure.kyc.KycFileStorage;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.KycDocumentRepository;
import com.nammamedmate.server.persistence.KycSubmissionRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.persistence.TenantSubscriptionRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class KycService {

  static final String FORBIDDEN_CODE = "FORBIDDEN";
  static final String NOT_FOUND_CODE = "NOT_FOUND";
  static final String VALIDATION_CODE = "VALIDATION_ERROR";
  static final String CONFLICT_CODE = "KYC_CONFLICT";
  static final String UNSUPPORTED_FILE_CODE = "UNSUPPORTED_FILE";
  static final String MISSING_EVIDENCE_CODE = "MISSING_EVIDENCE";
  static final Set<String> ALLOWED_CONTENT_TYPES =
      Set.of("application/pdf", "image/jpeg", "image/png");

  private final TenantRepository tenantRepository;
  private final AppUserRepository appUserRepository;
  private final KycSubmissionRepository kycSubmissionRepository;
  private final KycDocumentRepository kycDocumentRepository;
  private final TenantSubscriptionRepository tenantSubscriptionRepository;
  private final AccessQueryService accessQueryService;
  private final NotificationRoutingService notificationRoutingService;
  private final KycFileStorage kycFileStorage;
  private final Clock clock;

  public KycService(
      TenantRepository tenantRepository,
      AppUserRepository appUserRepository,
      KycSubmissionRepository kycSubmissionRepository,
      KycDocumentRepository kycDocumentRepository,
      TenantSubscriptionRepository tenantSubscriptionRepository,
      AccessQueryService accessQueryService,
      NotificationRoutingService notificationRoutingService,
      KycFileStorage kycFileStorage,
      Clock clock) {
    this.tenantRepository = tenantRepository;
    this.appUserRepository = appUserRepository;
    this.kycSubmissionRepository = kycSubmissionRepository;
    this.kycDocumentRepository = kycDocumentRepository;
    this.tenantSubscriptionRepository = tenantSubscriptionRepository;
    this.accessQueryService = accessQueryService;
    this.notificationRoutingService = notificationRoutingService;
    this.kycFileStorage = kycFileStorage;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public KycOwnerStatus ownerStatus(AuthPrincipal principal, UUID tenantId) {
    requireOwnerOf(principal, tenantId);
    Tenant tenant = requireTenant(tenantId);
    KycSubmission latest =
        kycSubmissionRepository.findFirstByTenantIdOrderBySubmittedAtDesc(tenantId).orElse(null);
    if (latest == null) {
      return new KycOwnerStatus(
          tenantId,
          tenant.getStatus().name(),
          tenant.getEmailVerifiedAt() != null,
          null,
          null,
          null,
          null,
          null,
          List.of());
    }
    return new KycOwnerStatus(
        tenantId,
        tenant.getStatus().name(),
        tenant.getEmailVerifiedAt() != null,
        latest.getStatus(),
        latest.getRejectionReason(),
        latest.getSubmittedAt(),
        latest.getReviewedAt(),
        latest.getId(),
        documentsFor(latest));
  }

  @Transactional
  public KycOwnerStatus submit(
      AuthPrincipal principal,
      UUID tenantId,
      String legalName,
      String drugLicenseNumber,
      String pan,
      String gstin,
      String addressLine1,
      String city,
      String state,
      String pincode,
      String contactPhone,
      MultipartFile drugLicense,
      MultipartFile panDoc,
      MultipartFile gstCertificate) {
    requireOwnerOf(principal, tenantId);
    Tenant tenant = tenantRepository.lockById(tenantId).orElseThrow(KycService::notFound);
    if (tenant.getDeletedAt() != null) {
      throw notFound();
    }
    if (tenant.getEmailVerifiedAt() == null) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY, "EMAIL_UNVERIFIED", "Verify the owner email before KYC");
    }
    if (tenant.getStatus() != TenantStatus.VERIFICATION_REQUIRED) {
      throw new ApiException(
          HttpStatus.CONFLICT, CONFLICT_CODE, "KYC is not open for this pharmacy");
    }
    if (kycSubmissionRepository
        .findByTenantIdAndStatus(tenantId, KycSubmissionStatus.SUBMITTED)
        .isPresent()) {
      throw new ApiException(
          HttpStatus.CONFLICT, CONFLICT_CODE, "A KYC pack is already waiting for review");
    }
    if (kycSubmissionRepository
        .findByTenantIdAndStatus(tenantId, KycSubmissionStatus.APPROVED)
        .isPresent()) {
      throw new ApiException(
          HttpStatus.CONFLICT, CONFLICT_CODE, "KYC is already approved for this pharmacy");
    }

    String cleanedLegal = required(legalName, "legalName");
    String cleanedLicense = required(drugLicenseNumber, "drugLicenseNumber");
    String cleanedPan = required(pan, "pan").toUpperCase();
    String cleanedGstin = optional(gstin);
    if (cleanedGstin != null) {
      cleanedGstin = cleanedGstin.toUpperCase();
    }
    String cleanedAddress = required(addressLine1, "addressLine1");
    String cleanedCity = required(city, "city");
    String cleanedState = required(state, "state");
    String cleanedPincode = required(pincode, "pincode");
    String cleanedPhone = required(contactPhone, "contactPhone");

    Map<KycDocType, MultipartFile> files = new EnumMap<>(KycDocType.class);
    files.put(KycDocType.DRUG_LICENSE, requireFile(drugLicense, "drugLicense"));
    files.put(KycDocType.PAN, requireFile(panDoc, "panDocument"));
    if (cleanedGstin != null) {
      files.put(KycDocType.GST_CERTIFICATE, requireFile(gstCertificate, "gstCertificate"));
    } else if (gstCertificate != null && !gstCertificate.isEmpty()) {
      files.put(KycDocType.GST_CERTIFICATE, validateFile(gstCertificate, "gstCertificate"));
    }

    Instant now = Instant.now(clock);
    UUID submissionId = UUID.randomUUID();
    KycSubmission submission = new KycSubmission();
    submission.setId(submissionId);
    submission.setTenantId(tenantId);
    submission.setLegalName(cleanedLegal);
    submission.setDrugLicenseNumber(cleanedLicense);
    submission.setPan(cleanedPan);
    submission.setGstin(cleanedGstin);
    submission.setAddressLine1(cleanedAddress);
    submission.setCity(cleanedCity);
    submission.setState(cleanedState);
    submission.setPincode(cleanedPincode);
    submission.setContactPhone(cleanedPhone);
    submission.setStatus(KycSubmissionStatus.SUBMITTED);
    submission.setSubmittedBy(principal.userId());
    submission.setSubmittedAt(now);
    submission.setCreatedAt(now);
    submission.setUpdatedAt(now);
    kycSubmissionRepository.save(submission);

    List<KycDocument> docs = new ArrayList<>();
    for (Map.Entry<KycDocType, MultipartFile> entry : files.entrySet()) {
      MultipartFile file = entry.getValue();
      String key = kycFileStorage.store(tenantId, submissionId, entry.getKey().name(), file);
      KycDocument document = new KycDocument();
      document.setId(UUID.randomUUID());
      document.setTenantId(tenantId);
      document.setSubmissionId(submissionId);
      document.setDocType(entry.getKey());
      document.setContentType(file.getContentType());
      document.setByteSize(file.getSize());
      document.setStorageKey(key);
      document.setOriginalFilename(
          file.getOriginalFilename() == null || file.getOriginalFilename().isBlank()
              ? entry.getKey().name().toLowerCase()
              : file.getOriginalFilename());
      document.setCreatedAt(now);
      docs.add(document);
    }
    kycDocumentRepository.saveAll(docs);

    return new KycOwnerStatus(
        tenantId,
        tenant.getStatus().name(),
        true,
        KycSubmissionStatus.SUBMITTED,
        null,
        now,
        null,
        submissionId,
        docs.stream()
            .map(
                doc ->
                    new KycDocumentView(
                        doc.getId(),
                        doc.getDocType(),
                        doc.getContentType(),
                        doc.getByteSize(),
                        doc.getOriginalFilename()))
            .toList());
  }

  @Transactional(readOnly = true)
  public KycQueue listPending(AuthPrincipal principal) {
    requireReviewer(principal);
    List<KycSubmission> pending =
        kycSubmissionRepository.findByStatusOrderBySubmittedAtAsc(KycSubmissionStatus.SUBMITTED);
    List<KycPackView> items = new ArrayList<>();
    for (KycSubmission submission : pending) {
      Tenant tenant = tenantRepository.findById(submission.getTenantId()).orElse(null);
      if (tenant == null || tenant.getDeletedAt() != null) {
        continue;
      }
      items.add(toPack(submission, tenant));
    }
    return new KycQueue(items);
  }

  @Transactional(readOnly = true)
  public KycPackView getPack(AuthPrincipal principal, UUID submissionId) {
    requireReviewer(principal);
    KycSubmission submission =
        kycSubmissionRepository.findById(submissionId).orElseThrow(KycService::notFound);
    Tenant tenant =
        tenantRepository.findById(submission.getTenantId()).orElseThrow(KycService::notFound);
    if (tenant.getDeletedAt() != null) {
      throw notFound();
    }
    return toPack(submission, tenant);
  }

  @Transactional(readOnly = true)
  public DocumentStream openDocument(AuthPrincipal principal, UUID submissionId, UUID documentId) {
    requireReviewer(principal);
    KycSubmission submission =
        kycSubmissionRepository.findById(submissionId).orElseThrow(KycService::notFound);
    KycDocument document =
        kycDocumentRepository
            .findByIdAndSubmissionIdAndTenantId(documentId, submissionId, submission.getTenantId())
            .orElseThrow(KycService::notFound);
    Path path = kycFileStorage.resolve(document.getStorageKey());
    return new DocumentStream(
        path, document.getContentType(), document.getOriginalFilename(), document.getByteSize());
  }

  @Transactional
  public KycPackView approve(AuthPrincipal principal, UUID submissionId) {
    requireReviewer(principal);
    KycSubmission submission =
        kycSubmissionRepository.lockById(submissionId).orElseThrow(KycService::notFound);
    if (submission.getStatus() != KycSubmissionStatus.SUBMITTED) {
      throw new ApiException(
          HttpStatus.CONFLICT, CONFLICT_CODE, "This KYC pack is no longer awaiting review");
    }
    Tenant tenant =
        tenantRepository.lockById(submission.getTenantId()).orElseThrow(KycService::notFound);
    Instant now = Instant.now(clock);
    submission.setStatus(KycSubmissionStatus.APPROVED);
    submission.setReviewedBy(principal.userId());
    submission.setReviewedAt(now);
    submission.setUpdatedAt(now);
    tenant.setStatus(TenantStatus.ACTIVE);
    tenant.setUpdatedAt(now);
    ensureFreePlan(tenant.getId(), now);
    notifyDecision(tenant.getId(), submission.getId(), "approved");
    return toPack(submission, tenant);
  }

  @Transactional
  public KycPackView reject(AuthPrincipal principal, UUID submissionId, String reason) {
    requireReviewer(principal);
    String cleanedReason = required(reason, "reason");
    KycSubmission submission =
        kycSubmissionRepository.lockById(submissionId).orElseThrow(KycService::notFound);
    if (submission.getStatus() != KycSubmissionStatus.SUBMITTED) {
      throw new ApiException(
          HttpStatus.CONFLICT, CONFLICT_CODE, "This KYC pack is no longer awaiting review");
    }
    Tenant tenant =
        tenantRepository.findById(submission.getTenantId()).orElseThrow(KycService::notFound);
    Instant now = Instant.now(clock);
    submission.setStatus(KycSubmissionStatus.REJECTED);
    submission.setRejectionReason(cleanedReason);
    submission.setReviewedBy(principal.userId());
    submission.setReviewedAt(now);
    submission.setUpdatedAt(now);
    notifyDecision(tenant.getId(), submission.getId(), "rejected");
    return toPack(submission, tenant);
  }

  private void ensureFreePlan(UUID tenantId, Instant now) {
    if (tenantSubscriptionRepository.existsByTenantId(tenantId)) {
      return;
    }
    TenantSubscription subscription = new TenantSubscription();
    subscription.setId(UUID.randomUUID());
    subscription.setTenantId(tenantId);
    subscription.setPlanCode(PlanCode.FREE);
    subscription.setStatus(SubscriptionStatus.ACTIVE);
    subscription.setStartedAt(now);
    subscription.setCreatedAt(now);
    subscription.setUpdatedAt(now);
    tenantSubscriptionRepository.save(subscription);
  }

  private void notifyDecision(UUID tenantId, UUID submissionId, String decision) {
    notificationRoutingService.route(
        new RouteCommand(
            "kyc-" + submissionId + "-" + decision,
            NotificationTrigger.KYC,
            tenantId,
            null,
            submissionId,
            null,
            null,
            null));
  }

  private void requireOwnerOf(AuthPrincipal principal, UUID tenantId) {
    if (principal == null
        || principal.role() != AppUserRole.pharmacy_owner
        || !Objects.equals(principal.tenantId(), tenantId)) {
      throw forbidden();
    }
  }

  private void requireReviewer(AuthPrincipal principal) {
    if (principal == null) {
      throw forbidden();
    }
    if (principal.role() == AppUserRole.admin_super) {
      return;
    }
    AppUser user =
        appUserRepository
            .findById(principal.userId())
            .filter(candidate -> candidate.getDeletedAt() == null)
            .orElseThrow(KycService::forbidden);
    if (!accessQueryService.effectiveModules(user).contains(ModuleCode.TENANT_KYC)) {
      throw forbidden();
    }
  }

  private Tenant requireTenant(UUID tenantId) {
    Tenant tenant = tenantRepository.findById(tenantId).orElseThrow(KycService::notFound);
    if (tenant.getDeletedAt() != null) {
      throw notFound();
    }
    return tenant;
  }

  private KycPackView toPack(KycSubmission submission, Tenant tenant) {
    return new KycPackView(
        submission.getId(),
        submission.getTenantId(),
        tenant.getName(),
        submission.getLegalName(),
        submission.getDrugLicenseNumber(),
        submission.getPan(),
        submission.getGstin(),
        submission.getAddressLine1(),
        submission.getCity(),
        submission.getState(),
        submission.getPincode(),
        submission.getContactPhone(),
        submission.getStatus(),
        submission.getRejectionReason(),
        submission.getSubmittedAt(),
        submission.getReviewedBy(),
        submission.getReviewedAt(),
        submission.getVersion(),
        documentsFor(submission));
  }

  private List<KycDocumentView> documentsFor(KycSubmission submission) {
    return kycDocumentRepository
        .findBySubmissionIdAndTenantIdOrderByDocTypeAsc(
            submission.getId(), submission.getTenantId())
        .stream()
        .map(
            doc ->
                new KycDocumentView(
                    doc.getId(),
                    doc.getDocType(),
                    doc.getContentType(),
                    doc.getByteSize(),
                    doc.getOriginalFilename()))
        .toList();
  }

  private static MultipartFile requireFile(MultipartFile file, String field) {
    if (file == null || file.isEmpty()) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          MISSING_EVIDENCE_CODE,
          "Missing required KYC document: " + field);
    }
    return validateFile(file, field);
  }

  private static MultipartFile validateFile(MultipartFile file, String field) {
    String contentType = file.getContentType();
    if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType)) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          UNSUPPORTED_FILE_CODE,
          "Unsupported file type for " + field);
    }
    return file;
  }

  private static String required(String value, String field) {
    if (value == null || value.isBlank()) {
      throw new ApiException(
          HttpStatus.BAD_REQUEST, VALIDATION_CODE, "Missing required field: " + field);
    }
    return value.trim();
  }

  private static String optional(String value) {
    if (value == null || value.isBlank()) {
      return null;
    }
    return value.trim();
  }

  private static ApiException forbidden() {
    return new ApiException(HttpStatus.FORBIDDEN, FORBIDDEN_CODE, "Forbidden");
  }

  private static ApiException notFound() {
    return new ApiException(HttpStatus.NOT_FOUND, NOT_FOUND_CODE, "Not found");
  }

  public record DocumentStream(Path path, String contentType, String filename, long byteSize) {}
}
