package com.nammamedmate.server.application.hospital;

import com.nammamedmate.server.application.access.AccessQueryService;
import com.nammamedmate.server.application.branch.BranchAssignmentService;
import com.nammamedmate.server.application.subscription.SubscriptionService;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.BranchStatus;
import com.nammamedmate.server.domain.HospitalBed;
import com.nammamedmate.server.domain.HospitalBedOccupancy;
import com.nammamedmate.server.domain.HospitalPolicy;
import com.nammamedmate.server.domain.HospitalWard;
import com.nammamedmate.server.domain.HospitalWardCategory;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.ModuleCode;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.HospitalBedRepository;
import com.nammamedmate.server.persistence.HospitalWardRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class HospitalWardService {

  private static final String NO_BRANCH_CODE = "NO_ACTIVE_BRANCH";
  private static final String NO_BRANCH_MESSAGE = "Select an outlet before opening IPD wards.";
  private static final String DUPLICATE_CODE = "DUPLICATE_CODE";
  private static final String DUPLICATE_CODE_MESSAGE = "A ward with this code already exists.";

  private final AppUserRepository appUserRepository;
  private final HospitalWardRepository wardRepository;
  private final HospitalBedRepository bedRepository;
  private final LocationRepository locationRepository;
  private final AccessQueryService accessQueryService;
  private final SubscriptionService subscriptionService;
  private final BranchAssignmentService branchAssignmentService;
  private final Clock clock;

  public HospitalWardService(
      AppUserRepository appUserRepository,
      HospitalWardRepository wardRepository,
      HospitalBedRepository bedRepository,
      LocationRepository locationRepository,
      AccessQueryService accessQueryService,
      SubscriptionService subscriptionService,
      BranchAssignmentService branchAssignmentService,
      Clock clock) {
    this.appUserRepository = appUserRepository;
    this.wardRepository = wardRepository;
    this.bedRepository = bedRepository;
    this.locationRepository = locationRepository;
    this.accessQueryService = accessQueryService;
    this.subscriptionService = subscriptionService;
    this.branchAssignmentService = branchAssignmentService;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public HospitalWardOccupancyView list(AuthPrincipal principal) {
    BranchContext ctx = requireRead(principal);
    List<HospitalWard> wards =
        wardRepository.findAllByTenantIdAndBranchIdOrderByNameAsc(ctx.tenantId(), ctx.branchId());
    List<HospitalBed> beds =
        bedRepository.findAllByTenantIdAndBranchIdOrderByWardIdAscSequenceNoAsc(
            ctx.tenantId(), ctx.branchId());
    Map<UUID, List<HospitalBed>> bedsByWard =
        beds.stream()
            .collect(
                Collectors.groupingBy(
                    HospitalBed::getWardId, LinkedHashMap::new, Collectors.toList()));
    List<HospitalWardView> wardViews =
        wards.stream()
            .map(ward -> toWardView(ward, bedsByWard.getOrDefault(ward.getId(), List.of())))
            .toList();
    int total = beds.size();
    int occupied =
        (int)
            beds.stream()
                .filter(bed -> bed.getOccupancyStatus() == HospitalBedOccupancy.OCCUPIED)
                .count();
    int free = total - occupied;
    int occupancyPercent = total == 0 ? 0 : Math.round(occupied * 100f / total);
    return new HospitalWardOccupancyView(
        wards.size(), total, occupied, free, occupancyPercent, occupied, wardViews);
  }

  @Transactional
  public HospitalWardView create(AuthPrincipal principal, HospitalWardCommand command) {
    BranchContext ctx = requireWardWriter(principal);
    NormalizedWard normalized = normalize(command, true);
    if (wardRepository.existsByTenantIdAndBranchIdAndCodeIgnoreCase(
        ctx.tenantId(), ctx.branchId(), normalized.code())) {
      throw duplicateCode();
    }
    Instant now = clock.instant();
    HospitalWard ward = new HospitalWard();
    ward.setId(UUID.randomUUID());
    ward.setTenantId(ctx.tenantId());
    ward.setBranchId(ctx.branchId());
    applyWardFields(ward, normalized);
    ward.setVersion(0L);
    ward.setCreatedAt(now);
    ward.setUpdatedAt(now);
    try {
      wardRepository.saveAndFlush(ward);
      List<HospitalBed> beds = allocateBeds(ward, normalized.capacity(), now);
      bedRepository.saveAll(beds);
    } catch (DataIntegrityViolationException ex) {
      throw duplicateCode();
    }
    return toWardView(
        ward,
        bedRepository.findAllByTenantIdAndBranchIdAndWardIdOrderBySequenceNoAsc(
            ctx.tenantId(), ctx.branchId(), ward.getId()));
  }

  @Transactional
  public HospitalWardView update(
      AuthPrincipal principal, UUID wardId, HospitalWardCommand command) {
    BranchContext ctx = requireWardWriter(principal);
    HospitalWard ward =
        wardRepository
            .findByIdAndTenantIdAndBranchId(wardId, ctx.tenantId(), ctx.branchId())
            .orElseThrow(this::notFound);
    NormalizedWard normalized = normalize(command, false);
    if (command.expectedVersion() != null && command.expectedVersion() != ward.getVersion()) {
      throw staleState();
    }
    if (wardRepository.existsByTenantIdAndBranchIdAndCodeIgnoreCaseAndIdNot(
        ctx.tenantId(), ctx.branchId(), normalized.code(), ward.getId())) {
      throw duplicateCode();
    }
    List<HospitalBed> existingBeds =
        bedRepository.findAllByTenantIdAndBranchIdAndWardIdOrderBySequenceNoAsc(
            ctx.tenantId(), ctx.branchId(), ward.getId());
    String oldCode = ward.getCode();
    int oldCapacity = ward.getCapacity();
    Instant now = clock.instant();
    if (normalized.capacity() < oldCapacity) {
      shrinkCapacity(existingBeds, normalized.capacity());
    } else if (normalized.capacity() > oldCapacity) {
      List<HospitalBed> added =
          appendBeds(ward, oldCapacity + 1, normalized.capacity(), normalized.code(), now);
      bedRepository.saveAll(added);
    }
    if (!Objects.equals(oldCode, normalized.code())) {
      relabelBeds(existingBeds, normalized.code(), now);
      bedRepository.saveAll(existingBeds);
    }
    applyWardFields(ward, normalized);
    ward.setVersion(ward.getVersion() + 1);
    ward.setUpdatedAt(now);
    try {
      wardRepository.saveAndFlush(ward);
    } catch (DataIntegrityViolationException ex) {
      throw duplicateCode();
    }
    List<HospitalBed> beds =
        bedRepository.findAllByTenantIdAndBranchIdAndWardIdOrderBySequenceNoAsc(
            ctx.tenantId(), ctx.branchId(), ward.getId());
    return toWardView(ward, beds);
  }

  @Transactional
  public void occupyBed(AuthPrincipal principal, UUID bedId) {
    BranchContext ctx = requireWardWriter(principal);
    HospitalBed bed =
        bedRepository
            .findByIdAndTenantIdAndBranchId(bedId, ctx.tenantId(), ctx.branchId())
            .orElseThrow(this::notFound);
    if (bed.getOccupancyStatus() == HospitalBedOccupancy.OCCUPIED) {
      throw HospitalPolicy.bedOccupied();
    }
    int updated =
        bedRepository.occupyIfFree(bedId, ctx.tenantId(), ctx.branchId(), clock.instant());
    if (updated == 0) {
      throw HospitalPolicy.bedOccupied();
    }
  }

  private void shrinkCapacity(List<HospitalBed> beds, int newCapacity) {
    List<HospitalBed> sorted =
        beds.stream()
            .sorted(Comparator.comparingInt(HospitalBed::getSequenceNo).reversed())
            .toList();
    for (HospitalBed bed : sorted) {
      if (bed.getSequenceNo() <= newCapacity) {
        continue;
      }
      if (bed.getOccupancyStatus() == HospitalBedOccupancy.OCCUPIED) {
        throw HospitalPolicy.bedOccupied();
      }
      bedRepository.delete(bed);
      beds.remove(bed);
    }
  }

  private void relabelBeds(List<HospitalBed> beds, String code, Instant now) {
    for (HospitalBed bed : beds) {
      bed.setLabel(bedLabel(code, bed.getSequenceNo()));
      bed.setUpdatedAt(now);
    }
  }

  private List<HospitalBed> allocateBeds(HospitalWard ward, int capacity, Instant now) {
    return appendBeds(ward, 1, capacity, ward.getCode(), now);
  }

  private List<HospitalBed> appendBeds(
      HospitalWard ward, int fromSequence, int toSequence, String code, Instant now) {
    List<HospitalBed> beds = new ArrayList<>();
    for (int seq = fromSequence; seq <= toSequence; seq++) {
      HospitalBed bed = new HospitalBed();
      bed.setId(UUID.randomUUID());
      bed.setTenantId(ward.getTenantId());
      bed.setBranchId(ward.getBranchId());
      bed.setWardId(ward.getId());
      bed.setSequenceNo(seq);
      bed.setLabel(bedLabel(code, seq));
      bed.setOccupancyStatus(HospitalBedOccupancy.FREE);
      bed.setVersion(0L);
      bed.setCreatedAt(now);
      bed.setUpdatedAt(now);
      beds.add(bed);
    }
    return beds;
  }

  private static String bedLabel(String code, int sequence) {
    return code.trim().toUpperCase() + "-" + sequence;
  }

  private void applyWardFields(HospitalWard ward, NormalizedWard normalized) {
    ward.setName(normalized.name());
    ward.setCode(normalized.code());
    ward.setFloor(normalized.floor());
    ward.setCategory(normalized.category());
    ward.setCapacity(normalized.capacity());
    ward.setNurseInCharge(normalized.nurseInCharge());
  }

  private NormalizedWard normalize(HospitalWardCommand command, boolean creating) {
    if (command == null
        || command.name() == null
        || command.name().isBlank()
        || command.code() == null
        || command.code().isBlank()
        || command.category() == null
        || command.capacity() == null) {
      throw validationError();
    }
    HospitalPolicy.requirePositiveCapacity(command.capacity());
    HospitalWardCategory category = HospitalPolicy.parseCategory(command.category());
    String code = command.code().trim().toUpperCase();
    if (code.isBlank()) {
      throw validationError();
    }
    return new NormalizedWard(
        command.name().trim(),
        code,
        trimOrNull(command.floor()),
        category,
        command.capacity(),
        trimOrNull(command.nurseInCharge()));
  }

  private HospitalWardView toWardView(HospitalWard ward, List<HospitalBed> beds) {
    List<HospitalBedView> bedViews =
        beds.stream()
            .sorted(Comparator.comparingInt(HospitalBed::getSequenceNo))
            .map(
                bed ->
                    new HospitalBedView(
                        bed.getId(),
                        bed.getSequenceNo(),
                        bed.getLabel(),
                        bed.getOccupancyStatus().name(),
                        bed.getVersion()))
            .toList();
    return new HospitalWardView(
        ward.getId(),
        ward.getName(),
        ward.getCode(),
        ward.getFloor(),
        ward.getCategory(),
        ward.getCapacity(),
        ward.getNurseInCharge(),
        ward.getVersion(),
        bedViews);
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

  private ApiException staleState() {
    return new ApiException(
        HttpStatus.CONFLICT, "STALE_STATE", "This ward was updated by someone else.");
  }

  private ApiException duplicateCode() {
    return new ApiException(HttpStatus.CONFLICT, DUPLICATE_CODE, DUPLICATE_CODE_MESSAGE);
  }

  private ApiException notFound() {
    return HospitalPolicy.notFound();
  }

  private record BranchContext(AppUser user, UUID tenantId, UUID branchId) {}

  private record NormalizedWard(
      String name,
      String code,
      String floor,
      HospitalWardCategory category,
      int capacity,
      String nurseInCharge) {}
}
