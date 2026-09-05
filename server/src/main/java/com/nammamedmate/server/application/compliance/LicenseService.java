package com.nammamedmate.server.application.compliance;

import com.nammamedmate.server.application.audit.AuditRecordCommand;
import com.nammamedmate.server.application.audit.AuditService;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.ComplianceDocType;
import com.nammamedmate.server.domain.ComplianceLicense;
import com.nammamedmate.server.domain.ComplianceLicenseEvidence;
import com.nammamedmate.server.domain.ComplianceLicenseScope;
import com.nammamedmate.server.domain.LicensePolicy;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.infrastructure.compliance.ComplianceFileStorage;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.ComplianceLicenseEvidenceRepository;
import com.nammamedmate.server.persistence.ComplianceLicenseRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class LicenseService {

  private static final Set<String> ALLOWED_TYPES =
      Set.of("application/pdf", "image/jpeg", "image/png");

  private final ComplianceLicenseRepository licenseRepository;
  private final ComplianceLicenseEvidenceRepository evidenceRepository;
  private final TenantRepository tenantRepository;
  private final LocationRepository locationRepository;
  private final AppUserRepository appUserRepository;
  private final ComplianceFileStorage fileStorage;
  private final LicenseDueScanner dueScanner;
  private final AuditService auditService;
  private final Clock clock;

  public LicenseService(
      ComplianceLicenseRepository licenseRepository,
      ComplianceLicenseEvidenceRepository evidenceRepository,
      TenantRepository tenantRepository,
      LocationRepository locationRepository,
      AppUserRepository appUserRepository,
      ComplianceFileStorage fileStorage,
      LicenseDueScanner dueScanner,
      AuditService auditService,
      Clock clock) {
    this.licenseRepository = licenseRepository;
    this.evidenceRepository = evidenceRepository;
    this.tenantRepository = tenantRepository;
    this.locationRepository = locationRepository;
    this.appUserRepository = appUserRepository;
    this.fileStorage = fileStorage;
    this.dueScanner = dueScanner;
    this.auditService = auditService;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public List<LicenseView> list(AuthPrincipal principal) {
    UUID tenantId = requireOwner(principal);
    LocalDate today = today();
    return licenseRepository.findAllByTenantIdOrderByExpiresOnAsc(tenantId).stream()
        .map(license -> toView(license, today))
        .toList();
  }

  @Transactional
  public List<LicenseView> listDue(AuthPrincipal principal) {
    UUID tenantId = requireOwner(principal);
    LocalDate today = today();
    return dueScanner.scanTenant(tenantId).stream().map(license -> toView(license, today)).toList();
  }

  @Transactional
  public List<AdminDueLicenseView> listPlatformDue(AuthPrincipal principal) {
    requireMaster(principal);
    LocalDate today = today();
    return dueScanner.scanAll().stream().map(license -> toAdminView(license, today)).toList();
  }

  @Transactional
  public LicenseView create(
      AuthPrincipal principal,
      String docType,
      String scope,
      String branchId,
      String staffUserId,
      String licenseNumber,
      String issuedOn,
      String expiresOn,
      MultipartFile evidence) {
    UUID tenantId = requireOwner(principal);
    ComplianceDocType type = LicensePolicy.requireType(docType);
    UUID branch = parseUuid(branchId);
    UUID staff = parseUuid(staffUserId);
    ComplianceLicenseScope parsedScope = LicensePolicy.requireScope(type, scope, branch, staff);
    String number = LicensePolicy.requireNumber(type, licenseNumber);
    LocalDate[] dates = LicensePolicy.requireDates(parseDate(issuedOn), parseDate(expiresOn));
    MultipartFile file = requireEvidence(evidence);
    if (parsedScope == ComplianceLicenseScope.BRANCH) {
      requireBranch(tenantId, branch);
    }
    if (parsedScope == ComplianceLicenseScope.STAFF) {
      requireStaff(tenantId, staff);
    }
    if (licenseRepository.findCurrent(tenantId, type, branch, staff).isPresent()) {
      throw LicensePolicy.conflict();
    }
    Instant now = Instant.now(clock);
    UUID licenseId = UUID.randomUUID();
    ComplianceLicense license = new ComplianceLicense();
    license.setId(licenseId);
    license.setTenantId(tenantId);
    license.setBranchId(branch);
    license.setStaffUserId(staff);
    license.setDocType(type);
    license.setScope(parsedScope);
    license.setLicenseNumber(number);
    license.setIssuedOn(dates[0]);
    license.setExpiresOn(dates[1]);
    license.setVersion(1);
    license.setCreatedAt(now);
    license.setUpdatedAt(now);
    licenseRepository.saveAndFlush(license);
    attachEvidence(principal, license, file, number, dates[0], dates[1], now);
    licenseRepository.saveAndFlush(license);
    audit(principal, "LICENSE_TRACK", license.getId());
    dueScanner.notifyIfDue(license);
    return toView(license, today());
  }

  @Transactional
  public LicenseView renew(
      AuthPrincipal principal,
      UUID licenseId,
      String licenseNumber,
      String issuedOn,
      String expiresOn,
      Integer expectedVersion,
      MultipartFile evidence) {
    UUID tenantId = requireOwner(principal);
    ComplianceLicense license =
        licenseRepository
            .lockByIdAndTenantId(licenseId, tenantId)
            .orElseThrow(LicensePolicy::notFound);
    LicensePolicy.requireVersion(license.getVersion(), expectedVersion);
    String number = LicensePolicy.requireNumber(license.getDocType(), licenseNumber);
    LocalDate[] dates = LicensePolicy.requireDates(parseDate(issuedOn), parseDate(expiresOn));
    MultipartFile file = requireEvidence(evidence);
    Instant now = Instant.now(clock);
    attachEvidence(principal, license, file, number, dates[0], dates[1], now);
    license.setLicenseNumber(number);
    license.setIssuedOn(dates[0]);
    license.setExpiresOn(dates[1]);
    license.setVersion(license.getVersion() + 1);
    license.setUpdatedAt(now);
    licenseRepository.saveAndFlush(license);
    audit(principal, "LICENSE_RENEW", license.getId());
    dueScanner.notifyIfDue(license);
    return toView(license, today());
  }

  @Transactional(readOnly = true)
  public LicenseEvidenceStream openEvidence(
      AuthPrincipal principal, UUID licenseId, UUID evidenceId) {
    UUID tenantId = requireOwner(principal);
    if (licenseRepository.findByIdAndTenantId(licenseId, tenantId).isEmpty()) {
      throw LicensePolicy.notFound();
    }
    ComplianceLicenseEvidence evidence =
        evidenceRepository
            .findByIdAndTenantIdAndLicenseId(evidenceId, tenantId, licenseId)
            .orElseThrow(LicensePolicy::notFound);
    return new LicenseEvidenceStream(
        fileStorage.resolve(evidence.getStorageKey()),
        evidence.getContentType(),
        evidence.getOriginalFilename(),
        evidence.getByteSize());
  }

  private void attachEvidence(
      AuthPrincipal principal,
      ComplianceLicense license,
      MultipartFile file,
      String number,
      LocalDate issuedOn,
      LocalDate expiresOn,
      Instant now) {
    UUID evidenceId = UUID.randomUUID();
    String key = fileStorage.store(license.getTenantId(), license.getId(), file);
    ComplianceLicenseEvidence row = new ComplianceLicenseEvidence();
    row.setId(evidenceId);
    row.setTenantId(license.getTenantId());
    row.setLicenseId(license.getId());
    row.setLicenseNumber(number);
    row.setIssuedOn(issuedOn);
    row.setExpiresOn(expiresOn);
    row.setStorageKey(key);
    row.setContentType(file.getContentType());
    row.setByteSize(file.getSize());
    row.setOriginalFilename(
        file.getOriginalFilename() == null || file.getOriginalFilename().isBlank()
            ? "evidence"
            : file.getOriginalFilename());
    row.setUploadedBy(principal.userId());
    row.setUploadedAt(now);
    evidenceRepository.saveAndFlush(row);
    license.setCurrentEvidenceId(evidenceId);
  }

  private LicenseView toView(ComplianceLicense license, LocalDate today) {
    List<LicenseView.EvidenceView> evidence =
        evidenceRepository
            .findAllByLicenseIdAndTenantIdOrderByUploadedAtAsc(
                license.getId(), license.getTenantId())
            .stream()
            .map(
                row ->
                    new LicenseView.EvidenceView(
                        row.getId(),
                        row.getLicenseNumber(),
                        row.getIssuedOn(),
                        row.getExpiresOn(),
                        row.getContentType(),
                        row.getByteSize(),
                        row.getUploadedAt()))
            .toList();
    return new LicenseView(
        license.getId(),
        license.getTenantId(),
        license.getBranchId(),
        license.getStaffUserId(),
        license.getDocType(),
        license.getScope(),
        license.getLicenseNumber(),
        license.getIssuedOn(),
        license.getExpiresOn(),
        license.getCurrentEvidenceId(),
        license.getVersion(),
        LicensePolicy.isDue(license.getExpiresOn(), today),
        evidence);
  }

  private AdminDueLicenseView toAdminView(ComplianceLicense license, LocalDate today) {
    Tenant tenant = tenantRepository.findById(license.getTenantId()).orElse(null);
    String branchName = null;
    if (license.getBranchId() != null) {
      branchName =
          locationRepository
              .findByIdAndTenantIdAndDeletedAtIsNull(license.getBranchId(), license.getTenantId())
              .map(Location::getName)
              .orElse(null);
    }
    String staffName = null;
    if (license.getStaffUserId() != null) {
      staffName =
          appUserRepository
              .findById(license.getStaffUserId())
              .filter(user -> license.getTenantId().equals(user.getTenantId()))
              .map(AppUser::getDisplayName)
              .orElse(null);
    }
    return new AdminDueLicenseView(
        license.getId(),
        license.getTenantId(),
        tenant == null ? null : tenant.getName(),
        license.getBranchId(),
        branchName,
        license.getStaffUserId(),
        staffName,
        license.getDocType(),
        license.getScope(),
        license.getLicenseNumber(),
        license.getIssuedOn(),
        license.getExpiresOn(),
        LicensePolicy.isDue(license.getExpiresOn(), today));
  }

  private UUID requireOwner(AuthPrincipal principal) {
    if (principal == null
        || principal.role() != AppUserRole.pharmacy_owner
        || principal.tenantId() == null) {
      throw LicensePolicy.forbidden();
    }
    return principal.tenantId();
  }

  private void requireMaster(AuthPrincipal principal) {
    if (principal == null || principal.role() != AppUserRole.admin_super) {
      throw LicensePolicy.forbidden();
    }
  }

  private void requireBranch(UUID tenantId, UUID branchId) {
    locationRepository
        .findByIdAndTenantIdAndDeletedAtIsNull(branchId, tenantId)
        .orElseThrow(LicensePolicy::notFound);
  }

  private void requireStaff(UUID tenantId, UUID staffUserId) {
    appUserRepository
        .findById(staffUserId)
        .filter(user -> tenantId.equals(user.getTenantId()) && user.getDeletedAt() == null)
        .orElseThrow(LicensePolicy::notFound);
  }

  private MultipartFile requireEvidence(MultipartFile file) {
    if (file == null || file.isEmpty()) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          LicensePolicy.MISSING_EVIDENCE,
          "Licence evidence file is required.");
    }
    String contentType = file.getContentType();
    if (contentType == null || !ALLOWED_TYPES.contains(contentType)) {
      throw LicensePolicy.unsupportedFile();
    }
    return file;
  }

  private void audit(AuthPrincipal principal, String action, UUID licenseId) {
    auditService.record(
        new AuditRecordCommand(
            principal.userId(),
            principal.tenantId(),
            principal.activeBranchId(),
            action,
            AuditService.OUTCOME_SUCCESS,
            null,
            null,
            null,
            principal.sessionId(),
            "{\"licenseId\":\"" + licenseId + "\"}"));
  }

  private LocalDate today() {
    return LocalDate.ofInstant(clock.instant(), ZoneOffset.UTC);
  }

  private static UUID parseUuid(String value) {
    if (value == null || value.isBlank()) {
      return null;
    }
    try {
      return UUID.fromString(value.trim());
    } catch (IllegalArgumentException ex) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
  }

  private static LocalDate parseDate(String value) {
    if (value == null || value.isBlank()) {
      return null;
    }
    try {
      return LocalDate.parse(value.trim());
    } catch (java.time.format.DateTimeParseException ex) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
  }
}
