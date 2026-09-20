package com.nammamedmate.server.application.hospital;

import com.nammamedmate.server.application.access.AccessQueryService;
import com.nammamedmate.server.application.audit.AuditRecordCommand;
import com.nammamedmate.server.application.audit.AuditService;
import com.nammamedmate.server.application.branch.BranchAssignmentService;
import com.nammamedmate.server.application.subscription.SubscriptionService;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.BranchStatus;
import com.nammamedmate.server.domain.Customer;
import com.nammamedmate.server.domain.Doctor;
import com.nammamedmate.server.domain.HospitalAdmission;
import com.nammamedmate.server.domain.HospitalAdmissionStatus;
import com.nammamedmate.server.domain.HospitalBed;
import com.nammamedmate.server.domain.HospitalBedOccupancy;
import com.nammamedmate.server.domain.HospitalDoctor;
import com.nammamedmate.server.domain.HospitalPayerType;
import com.nammamedmate.server.domain.HospitalPolicy;
import com.nammamedmate.server.domain.HospitalUhidSequence;
import com.nammamedmate.server.domain.HospitalWard;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.ModuleCode;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.CustomerRepository;
import com.nammamedmate.server.persistence.DoctorRepository;
import com.nammamedmate.server.persistence.HospitalAdmissionRepository;
import com.nammamedmate.server.persistence.HospitalBedRepository;
import com.nammamedmate.server.persistence.HospitalDoctorRepository;
import com.nammamedmate.server.persistence.HospitalUhidSequenceRepository;
import com.nammamedmate.server.persistence.HospitalWardRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class HospitalAdmissionService {

  private static final String NO_BRANCH_CODE = "NO_ACTIVE_BRANCH";
  private static final String NO_BRANCH_MESSAGE = "Select an outlet before opening wards.";
  private static final Pattern UHID_NUMERIC =
      Pattern.compile("^UHID-(\\d+)$", Pattern.CASE_INSENSITIVE);

  private final AppUserRepository appUserRepository;
  private final HospitalAdmissionRepository admissionRepository;
  private final HospitalUhidSequenceRepository uhidSequenceRepository;
  private final HospitalWardRepository wardRepository;
  private final HospitalBedRepository bedRepository;
  private final HospitalDoctorRepository hospitalDoctorRepository;
  private final DoctorRepository doctorRepository;
  private final CustomerRepository customerRepository;
  private final LocationRepository locationRepository;
  private final AccessQueryService accessQueryService;
  private final SubscriptionService subscriptionService;
  private final BranchAssignmentService branchAssignmentService;
  private final AuditService auditService;
  private final Clock clock;

  public HospitalAdmissionService(
      AppUserRepository appUserRepository,
      HospitalAdmissionRepository admissionRepository,
      HospitalUhidSequenceRepository uhidSequenceRepository,
      HospitalWardRepository wardRepository,
      HospitalBedRepository bedRepository,
      HospitalDoctorRepository hospitalDoctorRepository,
      DoctorRepository doctorRepository,
      CustomerRepository customerRepository,
      LocationRepository locationRepository,
      AccessQueryService accessQueryService,
      SubscriptionService subscriptionService,
      BranchAssignmentService branchAssignmentService,
      AuditService auditService,
      Clock clock) {
    this.appUserRepository = appUserRepository;
    this.admissionRepository = admissionRepository;
    this.uhidSequenceRepository = uhidSequenceRepository;
    this.wardRepository = wardRepository;
    this.bedRepository = bedRepository;
    this.hospitalDoctorRepository = hospitalDoctorRepository;
    this.doctorRepository = doctorRepository;
    this.customerRepository = customerRepository;
    this.locationRepository = locationRepository;
    this.accessQueryService = accessQueryService;
    this.subscriptionService = subscriptionService;
    this.branchAssignmentService = branchAssignmentService;
    this.auditService = auditService;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public String suggestNextUhid(AuthPrincipal principal) {
    BranchContext ctx = requireRead(principal);
    return HospitalPolicy.formatUhid(peekNextValue(ctx.tenantId()));
  }

  @Transactional(readOnly = true)
  public List<HospitalAdmissionView> listActive(AuthPrincipal principal) {
    BranchContext ctx = requireRead(principal);
    return loadViews(
        admissionRepository.findAllByTenantIdAndBranchIdAndStatusOrderByAdmittedAtDesc(
            ctx.tenantId(), ctx.branchId(), HospitalAdmissionStatus.ACTIVE),
        ctx);
  }

  @Transactional(readOnly = true)
  public HospitalAdmissionView getById(AuthPrincipal principal, UUID admissionId) {
    BranchContext ctx = requireRead(principal);
    HospitalAdmission admission =
        admissionRepository
            .findByIdAndTenantIdAndBranchId(admissionId, ctx.tenantId(), ctx.branchId())
            .orElseThrow(this::notFound);
    return toView(admission, ctx);
  }

  @Transactional(readOnly = true)
  public HospitalAdmissionView getByUhid(AuthPrincipal principal, String uhid) {
    BranchContext ctx = requireRead(principal);
    HospitalAdmission admission =
        admissionRepository
            .findByTenantIdAndBranchIdAndUhidIgnoreCase(ctx.tenantId(), ctx.branchId(), uhid)
            .orElseThrow(this::notFound);
    return toView(admission, ctx);
  }

  @Transactional
  public HospitalAdmissionView admit(AuthPrincipal principal, HospitalAdmissionCommand command) {
    BranchContext ctx = requireWardWriter(principal);
    NormalizedAdmission normalized = normalize(command);
    assertUhidAvailable(ctx.tenantId(), normalized.uhid());

    HospitalWard ward =
        wardRepository
            .findByIdAndTenantIdAndBranchId(normalized.wardId(), ctx.tenantId(), ctx.branchId())
            .orElseThrow(this::notFound);
    HospitalBed bed =
        bedRepository
            .findByIdAndTenantIdAndBranchId(normalized.bedId(), ctx.tenantId(), ctx.branchId())
            .orElseThrow(this::notFound);
    if (!bed.getWardId().equals(ward.getId())) {
      throw notFound();
    }
    if (bed.getOccupancyStatus() == HospitalBedOccupancy.OCCUPIED) {
      throw HospitalPolicy.bedOccupied();
    }

    UUID customerId = resolveCustomerId(ctx.tenantId(), normalized.phone());
    AttendingDoctor attending =
        resolveAttendingDoctor(ctx.tenantId(), normalized.attendingDoctorId());

    int updated =
        bedRepository.occupyIfFree(bed.getId(), ctx.tenantId(), ctx.branchId(), clock.instant());
    if (updated == 0) {
      throw HospitalPolicy.bedOccupied();
    }

    Instant now = clock.instant();
    HospitalAdmission admission = new HospitalAdmission();
    admission.setId(UUID.randomUUID());
    admission.setTenantId(ctx.tenantId());
    admission.setBranchId(ctx.branchId());
    admission.setUhid(normalized.uhid());
    admission.setPatientName(normalized.patientName());
    admission.setPhone(normalized.phone());
    admission.setAge(normalized.age());
    admission.setGender(normalized.gender());
    admission.setCustomerId(customerId);
    admission.setWardId(ward.getId());
    admission.setBedId(bed.getId());
    admission.setAttendingDoctorId(attending == null ? null : attending.profileId());
    admission.setDiagnosis(normalized.diagnosis());
    admission.setPayerType(normalized.payerType());
    admission.setInsurerName(normalized.insurerName());
    admission.setPolicyNumber(normalized.policyNumber());
    admission.setStatus(HospitalAdmissionStatus.ACTIVE);
    admission.setAdmittedAt(now);
    admission.setVersion(0L);
    admission.setCreatedAt(now);
    admission.setUpdatedAt(now);

    try {
      admissionRepository.saveAndFlush(admission);
    } catch (DataIntegrityViolationException ex) {
      throw duplicateUhidOrBed(ex);
    }

    bumpUhidSequence(ctx.tenantId(), normalized.uhid());
    audit(ctx, admission.getId());
    return toView(admission, ctx, ward, bed, attending);
  }

  @Transactional(readOnly = true)
  public long countActiveAdmissions(UUID tenantId, UUID branchId) {
    return admissionRepository.countByTenantIdAndBranchIdAndStatus(
        tenantId, branchId, HospitalAdmissionStatus.ACTIVE);
  }

  private int peekNextValue(UUID tenantId) {
    int fromAdmissions = admissionRepository.maxNumericUhidSuffix(tenantId);
    int fromSequence =
        uhidSequenceRepository
            .findByTenantId(tenantId)
            .map(HospitalUhidSequence::getNextValue)
            .orElse(1);
    return Math.max(fromAdmissions, fromSequence - 1) + 1;
  }

  private void bumpUhidSequence(UUID tenantId, String uhid) {
    Matcher matcher = UHID_NUMERIC.matcher(uhid.trim());
    if (!matcher.matches()) {
      return;
    }
    int admittedNumber = Integer.parseInt(matcher.group(1));
    HospitalUhidSequence sequence =
        uhidSequenceRepository
            .lockByTenantId(tenantId)
            .orElseGet(() -> insertSequence(tenantId, admittedNumber + 1));
    if (admittedNumber + 1 > sequence.getNextValue()) {
      sequence.setNextValue(admittedNumber + 1);
      uhidSequenceRepository.save(sequence);
    }
  }

  private HospitalUhidSequence insertSequence(UUID tenantId, int nextValue) {
    HospitalUhidSequence sequence = new HospitalUhidSequence();
    sequence.setTenantId(tenantId);
    sequence.setNextValue(nextValue);
    return uhidSequenceRepository.saveAndFlush(sequence);
  }

  private void assertUhidAvailable(UUID tenantId, String uhid) {
    if (admissionRepository.existsByTenantIdAndUhidIgnoreCase(tenantId, uhid)) {
      throw HospitalPolicy.uhidTaken();
    }
  }

  private UUID resolveCustomerId(UUID tenantId, String phone) {
    if (phone == null) {
      return null;
    }
    return customerRepository
        .findByTenantIdAndPhoneAndDeletedAtIsNull(tenantId, phone)
        .map(Customer::getId)
        .orElse(null);
  }

  private AttendingDoctor resolveAttendingDoctor(UUID tenantId, UUID hospitalDoctorId) {
    if (hospitalDoctorId == null) {
      return null;
    }
    HospitalDoctor profile =
        hospitalDoctorRepository
            .findByIdAndTenantId(hospitalDoctorId, tenantId)
            .orElseThrow(this::notFound);
    Doctor doctor =
        doctorRepository
            .findByIdAndTenantIdAndDeletedAtIsNull(profile.getDoctorId(), tenantId)
            .orElseThrow(this::notFound);
    return new AttendingDoctor(profile.getId(), doctor.getName());
  }

  private NormalizedAdmission normalize(HospitalAdmissionCommand command) {
    if (command == null) {
      throw validationError();
    }
    String patientName = trimOrNull(command.patientName());
    String uhid = trimOrNull(command.uhid());
    if (patientName == null
        || uhid == null
        || command.wardId() == null
        || command.bedId() == null) {
      throw validationError();
    }
    HospitalPayerType payerType = HospitalPolicy.parsePayerType(command.payerType());
    String insurerName = trimOrNull(command.insurerName());
    String policyNumber = trimOrNull(command.policyNumber());
    if (payerType == HospitalPayerType.INSURANCE_TPA) {
      HospitalPolicy.requireTpaFields(insurerName, policyNumber);
    } else {
      insurerName = null;
      policyNumber = null;
    }
    Integer age = command.age();
    if (age != null && age < 0) {
      throw validationError();
    }
    return new NormalizedAdmission(
        patientName,
        uhid,
        command.wardId(),
        command.bedId(),
        normalizePhone(command.phone()),
        age,
        trimOrNull(command.gender()),
        command.attendingDoctorId(),
        trimOrNull(command.diagnosis()),
        payerType,
        insurerName,
        policyNumber);
  }

  private static String normalizePhone(String phone) {
    if (phone == null || phone.isBlank()) {
      return null;
    }
    return phone.trim();
  }

  private List<HospitalAdmissionView> loadViews(
      List<HospitalAdmission> admissions, BranchContext ctx) {
    Map<UUID, HospitalWard> wards =
        wardRepository
            .findAllByTenantIdAndBranchIdOrderByNameAsc(ctx.tenantId(), ctx.branchId())
            .stream()
            .collect(Collectors.toMap(HospitalWard::getId, Function.identity()));
    Map<UUID, HospitalBed> beds =
        bedRepository
            .findAllByTenantIdAndBranchIdOrderByWardIdAscSequenceNoAsc(
                ctx.tenantId(), ctx.branchId())
            .stream()
            .collect(Collectors.toMap(HospitalBed::getId, Function.identity()));
    Map<UUID, AttendingDoctor> doctors = attendingIndex(ctx.tenantId());
    return admissions.stream()
        .map(
            admission ->
                toView(
                    admission,
                    ctx,
                    wards.get(admission.getWardId()),
                    beds.get(admission.getBedId()),
                    doctors.get(admission.getAttendingDoctorId())))
        .toList();
  }

  private HospitalAdmissionView toView(HospitalAdmission admission, BranchContext ctx) {
    HospitalWard ward =
        wardRepository
            .findByIdAndTenantIdAndBranchId(admission.getWardId(), ctx.tenantId(), ctx.branchId())
            .orElseThrow(this::notFound);
    HospitalBed bed =
        bedRepository
            .findByIdAndTenantIdAndBranchId(admission.getBedId(), ctx.tenantId(), ctx.branchId())
            .orElseThrow(this::notFound);
    AttendingDoctor attending =
        admission.getAttendingDoctorId() == null
            ? null
            : Optional.ofNullable(
                    attendingIndex(ctx.tenantId()).get(admission.getAttendingDoctorId()))
                .orElse(null);
    return toView(admission, ctx, ward, bed, attending);
  }

  private HospitalAdmissionView toView(
      HospitalAdmission admission,
      BranchContext ctx,
      HospitalWard ward,
      HospitalBed bed,
      AttendingDoctor attending) {
    if (ward == null || bed == null) {
      throw notFound();
    }
    return new HospitalAdmissionView(
        admission.getId(),
        admission.getUhid(),
        admission.getPatientName(),
        admission.getPhone(),
        admission.getAge(),
        admission.getGender(),
        admission.getCustomerId(),
        ward.getId(),
        ward.getName(),
        bed.getId(),
        bed.getLabel(),
        attending == null ? null : attending.profileId(),
        attending == null ? null : attending.name(),
        admission.getDiagnosis(),
        admission.getPayerType(),
        admission.getInsurerName(),
        admission.getPolicyNumber(),
        admission.getStatus(),
        admission.getAdmittedAt(),
        admission.getVersion());
  }

  private Map<UUID, AttendingDoctor> attendingIndex(UUID tenantId) {
    Map<UUID, Doctor> doctors =
        doctorRepository.findAllByTenantIdAndDeletedAtIsNullOrderByNameAsc(tenantId).stream()
            .collect(Collectors.toMap(Doctor::getId, Function.identity()));
    return hospitalDoctorRepository.findAllByTenantIdOrderByCreatedAtAsc(tenantId).stream()
        .collect(
            Collectors.toMap(
                HospitalDoctor::getId,
                profile -> {
                  Doctor doctor = doctors.get(profile.getDoctorId());
                  String name = doctor == null ? null : doctor.getName();
                  return new AttendingDoctor(profile.getId(), name);
                }));
  }

  private BranchContext requireRead(AuthPrincipal principal) {
    AppUser user = requireTenantUser(principal);
    UUID branchId = requireActiveBranch(principal);
    PlanCode plan = subscriptionService.resolvePlan(user.getTenantId());
    HospitalPolicy.assertEntitled(plan);
    Set<ModuleCode> modules = accessQueryService.effectiveModules(user);
    HospitalPolicy.requireHospitalModule(modules.contains(ModuleCode.HOSPITAL));
    loadVisibleBranch(user, branchId);
    return new BranchContext(user, user.getTenantId(), branchId);
  }

  private BranchContext requireWardWriter(AuthPrincipal principal) {
    AppUser user = requireTenantUser(principal);
    UUID branchId = requireActiveBranch(principal);
    PlanCode plan = subscriptionService.resolvePlan(user.getTenantId());
    HospitalPolicy.assertEntitled(plan);
    boolean hasHospital = accessQueryService.effectiveModules(user).contains(ModuleCode.HOSPITAL);
    boolean pharmacist =
        accessQueryService.hasAssignedRoleCode(user, HospitalPolicy.PHARMACIST_CODE);
    HospitalPolicy.requireWardWriter(user.getRole(), pharmacist, hasHospital);
    loadVisibleBranch(user, branchId);
    return new BranchContext(user, user.getTenantId(), branchId);
  }

  private UUID requireActiveBranch(AuthPrincipal principal) {
    if (principal.activeBranchId() == null) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, NO_BRANCH_CODE, NO_BRANCH_MESSAGE);
    }
    return principal.activeBranchId();
  }

  private Location loadVisibleBranch(AppUser user, UUID branchId) {
    Location branch =
        locationRepository
            .findByIdAndTenantIdAndDeletedAtIsNull(branchId, user.getTenantId())
            .orElseThrow(this::notFound);
    if (branch.getStatus() != BranchStatus.ACTIVE) {
      throw notFound();
    }
    if (!branchAssignmentService.canAccessBranch(user, branchId)) {
      throw notFound();
    }
    return branch;
  }

  private AppUser requireTenantUser(AuthPrincipal principal) {
    if (principal == null || principal.tenantId() == null) {
      throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "Unauthenticated");
    }
    return appUserRepository
        .findById(principal.userId())
        .filter(user -> user.getTenantId() != null)
        .orElseThrow(
            () -> new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "Unauthenticated"));
  }

  private void audit(BranchContext ctx, UUID admissionId) {
    auditService.record(
        new AuditRecordCommand(
            ctx.user().getId(),
            ctx.tenantId(),
            ctx.branchId(),
            "HOSPITAL_ADMISSION_ADMIT",
            AuditService.OUTCOME_SUCCESS,
            null,
            null,
            null,
            null,
            "{\"admissionId\":\"" + admissionId + "\"}"));
  }

  private static String trimOrNull(String value) {
    if (value == null) {
      return null;
    }
    String trimmed = value.trim();
    return trimmed.isEmpty() ? null : trimmed;
  }

  private static ApiException validationError() {
    return new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
  }

  private ApiException notFound() {
    return HospitalPolicy.notFound();
  }

  private ApiException duplicateUhidOrBed(DataIntegrityViolationException ex) {
    if (ex.getMessage() != null && ex.getMessage().toLowerCase().contains("uhid")) {
      return HospitalPolicy.uhidTaken();
    }
    return HospitalPolicy.bedOccupied();
  }

  private record BranchContext(AppUser user, UUID tenantId, UUID branchId) {}

  private record NormalizedAdmission(
      String patientName,
      String uhid,
      UUID wardId,
      UUID bedId,
      String phone,
      Integer age,
      String gender,
      UUID attendingDoctorId,
      String diagnosis,
      HospitalPayerType payerType,
      String insurerName,
      String policyNumber) {}

  private record AttendingDoctor(UUID profileId, String name) {}
}
