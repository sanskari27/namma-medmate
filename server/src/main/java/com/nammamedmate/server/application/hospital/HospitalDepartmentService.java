package com.nammamedmate.server.application.hospital;

import com.nammamedmate.server.application.access.AccessQueryService;
import com.nammamedmate.server.application.subscription.SubscriptionService;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.Doctor;
import com.nammamedmate.server.domain.HospitalDepartment;
import com.nammamedmate.server.domain.HospitalDepartmentType;
import com.nammamedmate.server.domain.HospitalPolicy;
import com.nammamedmate.server.domain.ModuleCode;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.DoctorRepository;
import com.nammamedmate.server.persistence.HospitalDepartmentRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.time.Clock;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class HospitalDepartmentService {

  static final String DUPLICATE_NAME = "DUPLICATE_NAME";
  static final String DUPLICATE_NAME_MESSAGE = "A department with this name already exists.";

  private final AppUserRepository appUserRepository;
  private final HospitalDepartmentRepository departmentRepository;
  private final DoctorRepository doctorRepository;
  private final AccessQueryService accessQueryService;
  private final SubscriptionService subscriptionService;
  private final Clock clock;

  public HospitalDepartmentService(
      AppUserRepository appUserRepository,
      HospitalDepartmentRepository departmentRepository,
      DoctorRepository doctorRepository,
      AccessQueryService accessQueryService,
      SubscriptionService subscriptionService,
      Clock clock) {
    this.appUserRepository = appUserRepository;
    this.departmentRepository = departmentRepository;
    this.doctorRepository = doctorRepository;
    this.accessQueryService = accessQueryService;
    this.subscriptionService = subscriptionService;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public List<HospitalDepartmentView> list(AuthPrincipal principal) {
    TenantContext ctx = requireRead(principal);
    Map<UUID, String> doctorNames = doctorNameIndex(ctx.tenantId());
    return departmentRepository.findAllByTenantIdOrderByNameAsc(ctx.tenantId()).stream()
        .map(dept -> toView(dept, doctorNames))
        .toList();
  }

  @Transactional
  public HospitalDepartmentView create(AuthPrincipal principal, HospitalDepartmentCommand command) {
    TenantContext ctx = requireWriter(principal);
    NormalizedDepartment normalized = normalize(command, true);
    if (departmentRepository.existsByTenantIdAndNameIgnoreCase(ctx.tenantId(), normalized.name())) {
      throw duplicateName();
    }
    UUID headDoctorId = resolveHeadDoctor(ctx.tenantId(), normalized.headDoctorId());
    Instant now = clock.instant();
    HospitalDepartment department = new HospitalDepartment();
    department.setId(UUID.randomUUID());
    department.setTenantId(ctx.tenantId());
    department.setName(normalized.name());
    department.setType(normalized.type());
    department.setHeadDoctorId(headDoctorId);
    department.setVersion(0L);
    department.setCreatedAt(now);
    department.setUpdatedAt(now);
    try {
      departmentRepository.saveAndFlush(department);
    } catch (DataIntegrityViolationException ex) {
      throw duplicateName();
    }
    return toView(department, doctorNameIndex(ctx.tenantId()));
  }

  @Transactional
  public HospitalDepartmentView update(
      AuthPrincipal principal, UUID departmentId, HospitalDepartmentCommand command) {
    TenantContext ctx = requireWriter(principal);
    HospitalDepartment department =
        departmentRepository
            .findByIdAndTenantId(departmentId, ctx.tenantId())
            .orElseThrow(this::notFound);
    if (command.expectedVersion() != null && command.expectedVersion() != department.getVersion()) {
      throw staleState();
    }
    NormalizedDepartment normalized = normalize(command, false);
    if (departmentRepository.existsByTenantIdAndNameIgnoreCaseAndIdNot(
        ctx.tenantId(), normalized.name(), department.getId())) {
      throw duplicateName();
    }
    UUID headDoctorId = resolveHeadDoctor(ctx.tenantId(), normalized.headDoctorId());
    department.setName(normalized.name());
    department.setType(normalized.type());
    department.setHeadDoctorId(headDoctorId);
    department.setVersion(department.getVersion() + 1);
    department.setUpdatedAt(clock.instant());
    try {
      departmentRepository.saveAndFlush(department);
    } catch (DataIntegrityViolationException ex) {
      throw duplicateName();
    }
    return toView(department, doctorNameIndex(ctx.tenantId()));
  }

  private UUID resolveHeadDoctor(UUID tenantId, UUID headDoctorId) {
    if (headDoctorId == null) {
      return null;
    }
    doctorRepository
        .findByIdAndTenantIdAndDeletedAtIsNull(headDoctorId, tenantId)
        .orElseThrow(this::notFound);
    return headDoctorId;
  }

  private Map<UUID, String> doctorNameIndex(UUID tenantId) {
    Map<UUID, String> names = new HashMap<>();
    for (Doctor doctor :
        doctorRepository.findAllByTenantIdAndDeletedAtIsNullOrderByNameAsc(tenantId)) {
      names.put(doctor.getId(), doctor.getName());
    }
    return names;
  }

  private HospitalDepartmentView toView(
      HospitalDepartment department, Map<UUID, String> doctorNames) {
    String headName =
        department.getHeadDoctorId() == null ? null : doctorNames.get(department.getHeadDoctorId());
    return new HospitalDepartmentView(
        department.getId(),
        department.getName(),
        department.getType(),
        department.getHeadDoctorId(),
        headName,
        department.getVersion());
  }

  private NormalizedDepartment normalize(HospitalDepartmentCommand command, boolean creating) {
    if (command == null
        || command.name() == null
        || command.name().isBlank()
        || command.type() == null) {
      throw validationError();
    }
    String name = command.name().trim();
    if (name.isBlank() || name.length() > 200) {
      throw validationError();
    }
    HospitalDepartmentType type = HospitalPolicy.parseDepartmentType(command.type());
    return new NormalizedDepartment(name, type, command.headDoctorId());
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

  private static ApiException validationError() {
    return new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
  }

  private ApiException staleState() {
    return new ApiException(
        HttpStatus.CONFLICT, "STALE_STATE", "This department was updated by someone else.");
  }

  private ApiException duplicateName() {
    return new ApiException(HttpStatus.CONFLICT, DUPLICATE_NAME, DUPLICATE_NAME_MESSAGE);
  }

  private ApiException notFound() {
    return HospitalPolicy.notFound();
  }

  private record TenantContext(AppUser user, UUID tenantId) {}

  private record NormalizedDepartment(
      String name, HospitalDepartmentType type, UUID headDoctorId) {}
}
