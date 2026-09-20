package com.nammamedmate.server.application.hospital;

import com.nammamedmate.server.application.access.AccessQueryService;
import com.nammamedmate.server.application.subscription.SubscriptionService;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.Doctor;
import com.nammamedmate.server.domain.HospitalDepartment;
import com.nammamedmate.server.domain.HospitalDoctor;
import com.nammamedmate.server.domain.HospitalDoctorStatus;
import com.nammamedmate.server.domain.HospitalPolicy;
import com.nammamedmate.server.domain.ModuleCode;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.DoctorRepository;
import com.nammamedmate.server.persistence.HospitalDepartmentRepository;
import com.nammamedmate.server.persistence.HospitalDoctorRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.time.Clock;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class HospitalDoctorService {

  static final String REGISTRATION_TAKEN_CODE = "REGISTRATION_TAKEN";
  static final String REGISTRATION_TAKEN_MESSAGE =
      "A doctor with this registration number already exists.";

  private final AppUserRepository appUserRepository;
  private final HospitalDoctorRepository hospitalDoctorRepository;
  private final HospitalDepartmentRepository departmentRepository;
  private final DoctorRepository doctorRepository;
  private final AccessQueryService accessQueryService;
  private final SubscriptionService subscriptionService;
  private final Clock clock;

  public HospitalDoctorService(
      AppUserRepository appUserRepository,
      HospitalDoctorRepository hospitalDoctorRepository,
      HospitalDepartmentRepository departmentRepository,
      DoctorRepository doctorRepository,
      AccessQueryService accessQueryService,
      SubscriptionService subscriptionService,
      Clock clock) {
    this.appUserRepository = appUserRepository;
    this.hospitalDoctorRepository = hospitalDoctorRepository;
    this.departmentRepository = departmentRepository;
    this.doctorRepository = doctorRepository;
    this.accessQueryService = accessQueryService;
    this.subscriptionService = subscriptionService;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public List<HospitalDoctorView> list(AuthPrincipal principal) {
    TenantContext ctx = requireRead(principal);
    Map<UUID, HospitalDepartment> departments = departmentIndex(ctx.tenantId());
    return hospitalDoctorRepository.findAllByTenantIdOrderByCreatedAtAsc(ctx.tenantId()).stream()
        .map(
            profile ->
                toView(profile, requireDoctor(profile.getDoctorId(), ctx.tenantId()), departments))
        .toList();
  }

  @Transactional
  public HospitalDoctorView create(AuthPrincipal principal, HospitalDoctorCommand command) {
    TenantContext ctx = requireWriter(principal);
    NormalizedDoctor normalized = normalize(command, true);
    Map<UUID, HospitalDepartment> departments = departmentIndex(ctx.tenantId());
    resolveDepartment(ctx.tenantId(), normalized.departmentId(), departments);
    Doctor doctor = resolveDoctorForCreate(ctx.tenantId(), normalized);
    Instant now = clock.instant();
    HospitalDoctor profile = new HospitalDoctor();
    profile.setId(UUID.randomUUID());
    profile.setTenantId(ctx.tenantId());
    profile.setDoctorId(doctor.getId());
    applyProfileFields(profile, normalized);
    profile.setVersion(0L);
    profile.setCreatedAt(now);
    profile.setUpdatedAt(now);
    hospitalDoctorRepository.saveAndFlush(profile);
    return toView(profile, doctor, departments);
  }

  @Transactional
  public HospitalDoctorView update(
      AuthPrincipal principal, UUID doctorId, HospitalDoctorCommand command) {
    TenantContext ctx = requireWriter(principal);
    Doctor doctor = requireDoctor(doctorId, ctx.tenantId());
    HospitalDoctor profile =
        hospitalDoctorRepository
            .findByDoctorIdAndTenantId(doctorId, ctx.tenantId())
            .orElseThrow(this::notFound);
    if (command.expectedVersion() != null && command.expectedVersion() != profile.getVersion()) {
      throw staleState();
    }
    NormalizedDoctor normalized = normalize(command, false);
    Map<UUID, HospitalDepartment> departments = departmentIndex(ctx.tenantId());
    resolveDepartment(ctx.tenantId(), normalized.departmentId(), departments);
    assertRegistrationAvailableForUpdate(
        ctx.tenantId(), normalized.registrationNumber(), doctor.getId());
    doctor.setName(normalized.name());
    doctor.setRegistrationNumber(normalized.registrationNumber());
    doctor.setPhone(normalized.phone());
    doctor.setUpdatedAt(clock.instant());
    doctorRepository.save(doctor);
    applyProfileFields(profile, normalized);
    profile.setVersion(profile.getVersion() + 1);
    profile.setUpdatedAt(clock.instant());
    hospitalDoctorRepository.save(profile);
    return toView(profile, doctor, departments);
  }

  private Doctor resolveDoctorForCreate(UUID tenantId, NormalizedDoctor normalized) {
    if (normalized.registrationNumber() != null) {
      return doctorRepository
          .findByTenantIdAndRegistrationNumberAndDeletedAtIsNull(
              tenantId, normalized.registrationNumber())
          .map(
              existing -> {
                if (hospitalDoctorRepository.existsByTenantIdAndDoctorId(
                    tenantId, existing.getId())) {
                  throw registrationTaken();
                }
                existing.setName(normalized.name());
                existing.setPhone(normalized.phone());
                existing.setUpdatedAt(clock.instant());
                return doctorRepository.save(existing);
              })
          .orElseGet(() -> createDoctor(tenantId, normalized));
    }
    return createDoctor(tenantId, normalized);
  }

  private Doctor createDoctor(UUID tenantId, NormalizedDoctor normalized) {
    Instant now = clock.instant();
    Doctor doctor = new Doctor();
    doctor.setId(UUID.randomUUID());
    doctor.setTenantId(tenantId);
    doctor.setName(normalized.name());
    doctor.setRegistrationNumber(normalized.registrationNumber());
    doctor.setPhone(normalized.phone());
    doctor.setCreatedAt(now);
    doctor.setUpdatedAt(now);
    return doctorRepository.save(doctor);
  }

  private void assertRegistrationAvailableForUpdate(
      UUID tenantId, String registration, UUID doctorId) {
    if (registration == null) {
      return;
    }
    doctorRepository
        .findByTenantIdAndRegistrationNumberAndDeletedAtIsNull(tenantId, registration)
        .ifPresent(
            existing -> {
              if (!existing.getId().equals(doctorId)) {
                throw registrationTaken();
              }
            });
  }

  private void applyProfileFields(HospitalDoctor profile, NormalizedDoctor normalized) {
    profile.setDepartmentId(normalized.departmentId());
    profile.setQualification(normalized.qualification());
    profile.setSpecialty(normalized.specialty());
    profile.setGender(normalized.gender());
    profile.setExperienceYears(normalized.experienceYears());
    profile.setEmail(normalized.email());
    profile.setOpdRoom(normalized.opdRoom());
    profile.setConsultingDays(normalized.consultingDays());
    profile.setConsultingHours(normalized.consultingHours());
    profile.setConsultationFeePaise(normalized.consultationFeePaise());
    profile.setStatus(normalized.status());
    profile.setLanguages(normalized.languages());
    profile.setNotes(normalized.notes());
  }

  private HospitalDoctorView toView(
      HospitalDoctor profile, Doctor doctor, Map<UUID, HospitalDepartment> departments) {
    HospitalDepartment department =
        profile.getDepartmentId() == null ? null : departments.get(profile.getDepartmentId());
    return new HospitalDoctorView(
        profile.getId(),
        doctor.getId(),
        doctor.getName(),
        doctor.getRegistrationNumber(),
        doctor.getPhone(),
        profile.getDepartmentId(),
        department == null ? null : department.getName(),
        profile.getQualification(),
        profile.getSpecialty(),
        profile.getGender(),
        profile.getExperienceYears(),
        profile.getEmail(),
        profile.getOpdRoom(),
        profile.getConsultingDays(),
        profile.getConsultingHours(),
        profile.getConsultationFeePaise(),
        profile.getStatus(),
        profile.getLanguages(),
        profile.getNotes(),
        profile.getVersion());
  }

  private Map<UUID, HospitalDepartment> departmentIndex(UUID tenantId) {
    Map<UUID, HospitalDepartment> departments = new HashMap<>();
    for (HospitalDepartment department :
        departmentRepository.findAllByTenantIdOrderByNameAsc(tenantId)) {
      departments.put(department.getId(), department);
    }
    return departments;
  }

  private void resolveDepartment(
      UUID tenantId, UUID departmentId, Map<UUID, HospitalDepartment> departments) {
    if (departmentId == null) {
      return;
    }
    if (!departments.containsKey(departmentId)) {
      departmentRepository.findByIdAndTenantId(departmentId, tenantId).orElseThrow(this::notFound);
    }
  }

  private Doctor requireDoctor(UUID doctorId, UUID tenantId) {
    return doctorRepository
        .findByIdAndTenantIdAndDeletedAtIsNull(doctorId, tenantId)
        .orElseThrow(this::notFound);
  }

  private NormalizedDoctor normalize(HospitalDoctorCommand command, boolean creating) {
    if (command == null || command.name() == null || command.name().isBlank()) {
      throw validationError();
    }
    String name = command.name().trim();
    if (name.isBlank() || name.length() > 200) {
      throw validationError();
    }
    if (command.status() == null || command.status().isBlank()) {
      throw validationError();
    }
    HospitalDoctorStatus status = HospitalPolicy.parseDoctorStatus(command.status());
    long fee = command.consultationFeePaise() == null ? 0L : command.consultationFeePaise();
    if (fee < 0L) {
      throw validationError();
    }
    Integer experience = command.experienceYears();
    if (experience != null && experience < 0) {
      throw validationError();
    }
    return new NormalizedDoctor(
        name,
        blankToNull(command.registrationNumber()),
        blankToNull(command.phone()),
        command.departmentId(),
        blankToNull(command.qualification()),
        blankToNull(command.specialty()),
        blankToNull(command.gender()),
        experience,
        blankToNull(command.email()),
        blankToNull(command.opdRoom()),
        blankToNull(command.consultingDays()),
        blankToNull(command.consultingHours()),
        fee,
        status,
        blankToNull(command.languages()),
        blankToNull(command.notes()));
  }

  private TenantContext requireRead(AuthPrincipal principal) {
    AppUser user = requireTenantUser(principal);
    PlanCode plan = subscriptionService.resolvePlan(user.getTenantId());
    HospitalPolicy.assertEntitled(plan);
    Set<ModuleCode> modules = accessQueryService.effectiveModules(user);
    HospitalPolicy.requireHospitalModule(modules.contains(ModuleCode.HOSPITAL));
    return new TenantContext(user, user.getTenantId());
  }

  private TenantContext requireWriter(AuthPrincipal principal) {
    AppUser user = requireTenantUser(principal);
    PlanCode plan = subscriptionService.resolvePlan(user.getTenantId());
    HospitalPolicy.assertEntitled(plan);
    boolean hasHospital = accessQueryService.effectiveModules(user).contains(ModuleCode.HOSPITAL);
    boolean pharmacist =
        accessQueryService.hasAssignedRoleCode(user, HospitalPolicy.PHARMACIST_CODE);
    HospitalPolicy.requireWardWriter(user.getRole(), pharmacist, hasHospital);
    return new TenantContext(user, user.getTenantId());
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

  private static String blankToNull(String value) {
    if (value == null || value.isBlank()) {
      return null;
    }
    return value.trim();
  }

  private static ApiException validationError() {
    return new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
  }

  private ApiException staleState() {
    return new ApiException(
        HttpStatus.CONFLICT, "STALE_STATE", "This doctor profile was updated by someone else.");
  }

  private ApiException registrationTaken() {
    return new ApiException(
        HttpStatus.CONFLICT, REGISTRATION_TAKEN_CODE, REGISTRATION_TAKEN_MESSAGE);
  }

  private ApiException notFound() {
    return HospitalPolicy.notFound();
  }

  private record TenantContext(AppUser user, UUID tenantId) {}

  private record NormalizedDoctor(
      String name,
      String registrationNumber,
      String phone,
      UUID departmentId,
      String qualification,
      String specialty,
      String gender,
      Integer experienceYears,
      String email,
      String opdRoom,
      String consultingDays,
      String consultingHours,
      long consultationFeePaise,
      HospitalDoctorStatus status,
      String languages,
      String notes) {}
}
