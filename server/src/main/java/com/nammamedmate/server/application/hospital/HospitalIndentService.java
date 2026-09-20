package com.nammamedmate.server.application.hospital;

import com.nammamedmate.server.application.access.AccessQueryService;
import com.nammamedmate.server.application.audit.AuditRecordCommand;
import com.nammamedmate.server.application.audit.AuditService;
import com.nammamedmate.server.application.branch.BranchAssignmentService;
import com.nammamedmate.server.application.subscription.SubscriptionService;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.BranchStatus;
import com.nammamedmate.server.domain.FinanceReportPolicy;
import com.nammamedmate.server.domain.HospitalBed;
import com.nammamedmate.server.domain.HospitalIndent;
import com.nammamedmate.server.domain.HospitalIndentLine;
import com.nammamedmate.server.domain.HospitalIndentSequence;
import com.nammamedmate.server.domain.HospitalIndentStatus;
import com.nammamedmate.server.domain.HospitalPolicy;
import com.nammamedmate.server.domain.HospitalWard;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.ModuleCode;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.Product;
import com.nammamedmate.server.domain.PurchaseOrderPolicy;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.HospitalBedRepository;
import com.nammamedmate.server.persistence.HospitalIndentLineRepository;
import com.nammamedmate.server.persistence.HospitalIndentRepository;
import com.nammamedmate.server.persistence.HospitalIndentSequenceRepository;
import com.nammamedmate.server.persistence.HospitalWardRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.ProductRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class HospitalIndentService {

  private static final String NO_BRANCH_CODE = "NO_ACTIVE_BRANCH";
  private static final String NO_BRANCH_MESSAGE = "Select an outlet before opening ward indents.";

  private final AppUserRepository appUserRepository;
  private final HospitalIndentRepository indentRepository;
  private final HospitalIndentLineRepository lineRepository;
  private final HospitalIndentSequenceRepository sequenceRepository;
  private final HospitalWardRepository wardRepository;
  private final HospitalBedRepository bedRepository;
  private final ProductRepository productRepository;
  private final LocationRepository locationRepository;
  private final AccessQueryService accessQueryService;
  private final SubscriptionService subscriptionService;
  private final BranchAssignmentService branchAssignmentService;
  private final AuditService auditService;
  private final Clock clock;

  public HospitalIndentService(
      AppUserRepository appUserRepository,
      HospitalIndentRepository indentRepository,
      HospitalIndentLineRepository lineRepository,
      HospitalIndentSequenceRepository sequenceRepository,
      HospitalWardRepository wardRepository,
      HospitalBedRepository bedRepository,
      ProductRepository productRepository,
      LocationRepository locationRepository,
      AccessQueryService accessQueryService,
      SubscriptionService subscriptionService,
      BranchAssignmentService branchAssignmentService,
      AuditService auditService,
      Clock clock) {
    this.appUserRepository = appUserRepository;
    this.indentRepository = indentRepository;
    this.lineRepository = lineRepository;
    this.sequenceRepository = sequenceRepository;
    this.wardRepository = wardRepository;
    this.bedRepository = bedRepository;
    this.productRepository = productRepository;
    this.locationRepository = locationRepository;
    this.accessQueryService = accessQueryService;
    this.subscriptionService = subscriptionService;
    this.branchAssignmentService = branchAssignmentService;
    this.auditService = auditService;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public HospitalIndentListView list(AuthPrincipal principal, HospitalIndentStatus statusFilter) {
    BranchContext ctx = requireRead(principal);
    List<HospitalIndent> indents =
        statusFilter == null
            ? indentRepository.findAllByTenantIdAndBranchIdOrderByRequestedAtDesc(
                ctx.tenantId(), ctx.branchId())
            : indentRepository.findAllByTenantIdAndBranchIdAndStatusOrderByRequestedAtDesc(
                ctx.tenantId(), ctx.branchId(), statusFilter);
    return toListView(ctx, indents);
  }

  @Transactional(readOnly = true)
  public HospitalIndentView getById(AuthPrincipal principal, UUID indentId) {
    BranchContext ctx = requireRead(principal);
    HospitalIndent indent = requireIndent(indentId, ctx);
    return toView(ctx, indent);
  }

  @Transactional
  public HospitalIndentView create(AuthPrincipal principal, HospitalIndentCommand command) {
    BranchContext ctx = requireIndentWriter(principal);
    NormalizedCommand normalized = normalize(command);
    WardBed wardBed = resolveWardBed(ctx, normalized.wardId(), normalized.bedId());
    List<ResolvedLine> lines = resolveLines(ctx.tenantId(), normalized.lines());
    Instant now = clock.instant();
    String indentNumber = nextIndentNumber(ctx);
    HospitalIndent indent = new HospitalIndent();
    indent.setId(UUID.randomUUID());
    indent.setTenantId(ctx.tenantId());
    indent.setBranchId(ctx.branchId());
    indent.setIndentNumber(indentNumber);
    indent.setWardId(wardBed.ward().getId());
    indent.setBedId(wardBed.bed() == null ? null : wardBed.bed().getId());
    indent.setPatientName(normalized.patientName());
    indent.setNote(normalized.note());
    indent.setRequestedBy(normalized.requestedBy());
    indent.setRequestedAt(now);
    indent.setStatus(HospitalIndentStatus.PENDING);
    indent.setVersion(0L);
    indent.setCreatedAt(now);
    indent.setUpdatedAt(now);
    indentRepository.save(indent);
    persistLines(ctx, indent.getId(), lines, now);
    audit(ctx, "HOSPITAL_INDENT_CREATE", indent.getId());
    return toView(ctx, indent, wardBed.ward(), wardBed.bed(), lines);
  }

  @Transactional
  public HospitalIndentView approve(AuthPrincipal principal, UUID indentId) {
    BranchContext ctx = requireIndentWriter(principal);
    HospitalIndent indent =
        indentRepository
            .lockByIdAndTenantIdAndBranchId(indentId, ctx.tenantId(), ctx.branchId())
            .orElseThrow(this::notFound);
    HospitalPolicy.assertCanApprove(indent.getStatus());
    if (indent.getStatus() == HospitalIndentStatus.PENDING) {
      Instant now = clock.instant();
      indent.setStatus(HospitalIndentStatus.APPROVED);
      indent.setVersion(indent.getVersion() + 1);
      indent.setUpdatedAt(now);
      indentRepository.save(indent);
      audit(ctx, "HOSPITAL_INDENT_APPROVE", indent.getId());
    }
    return toView(ctx, indent);
  }

  @Transactional
  public HospitalIndentView reject(AuthPrincipal principal, UUID indentId) {
    BranchContext ctx = requireIndentWriter(principal);
    HospitalIndent indent =
        indentRepository
            .lockByIdAndTenantIdAndBranchId(indentId, ctx.tenantId(), ctx.branchId())
            .orElseThrow(this::notFound);
    HospitalPolicy.assertCanReject(indent.getStatus());
    if (indent.getStatus() == HospitalIndentStatus.PENDING) {
      Instant now = clock.instant();
      indent.setStatus(HospitalIndentStatus.REJECTED);
      indent.setVersion(indent.getVersion() + 1);
      indent.setUpdatedAt(now);
      indentRepository.save(indent);
      audit(ctx, "HOSPITAL_INDENT_REJECT", indent.getId());
    }
    return toView(ctx, indent);
  }

  @Transactional
  public void markIssued(
      UUID tenantId,
      UUID branchId,
      UUID indentId,
      String invoiceRef,
      Instant issuedAt,
      Map<UUID, BigDecimal> issuedByProduct) {
    HospitalIndent indent =
        indentRepository
            .lockByIdAndTenantIdAndBranchId(indentId, tenantId, branchId)
            .orElseThrow(this::notFound);
    HospitalPolicy.assertCanIssue(indent.getStatus());
    indent.setStatus(HospitalIndentStatus.ISSUED);
    indent.setHospitalInvoiceRef(invoiceRef);
    indent.setIssuedAt(issuedAt);
    indent.setVersion(indent.getVersion() + 1);
    indent.setUpdatedAt(issuedAt);
    indentRepository.save(indent);
    for (HospitalIndentLine line : lineRepository.findAllByIndentIdOrderBySortOrderAsc(indentId)) {
      BigDecimal issued = issuedByProduct.get(line.getProductId());
      if (issued != null) {
        line.setIssuedQty(issued);
        lineRepository.save(line);
      }
    }
  }

  private HospitalIndentListView toListView(BranchContext ctx, List<HospitalIndent> indents) {
    Instant now = clock.instant();
    LocalDate today = FinanceReportPolicy.today(now);
    Instant dayStart = FinanceReportPolicy.startInstant(today);
    Instant dayEnd = FinanceReportPolicy.endExclusive(today);
    long pending =
        indentRepository.countByTenantIdAndBranchIdAndStatus(
            ctx.tenantId(), ctx.branchId(), HospitalIndentStatus.PENDING);
    long approved =
        indentRepository.countByTenantIdAndBranchIdAndStatus(
            ctx.tenantId(), ctx.branchId(), HospitalIndentStatus.APPROVED);
    long issuedToday =
        indentRepository.countIssuedToday(ctx.tenantId(), ctx.branchId(), dayStart, dayEnd);
    long total = indentRepository.countByTenantIdAndBranchId(ctx.tenantId(), ctx.branchId());
    Map<UUID, HospitalWard> wards = loadWards(ctx);
    Map<UUID, HospitalBed> beds = loadBeds(ctx);
    List<HospitalIndentView> items =
        indents.stream()
            .map(
                indent ->
                    toView(
                        indent,
                        wards.get(indent.getWardId()),
                        indent.getBedId() == null ? null : beds.get(indent.getBedId()),
                        loadLineViews(indent.getId())))
            .toList();
    return new HospitalIndentListView(pending, approved, issuedToday, total, items);
  }

  private HospitalIndentView toView(BranchContext ctx, HospitalIndent indent) {
    HospitalWard ward =
        wardRepository
            .findByIdAndTenantIdAndBranchId(indent.getWardId(), ctx.tenantId(), ctx.branchId())
            .orElseThrow(this::notFound);
    HospitalBed bed = null;
    if (indent.getBedId() != null) {
      bed =
          bedRepository
              .findByIdAndTenantIdAndBranchId(indent.getBedId(), ctx.tenantId(), ctx.branchId())
              .orElseThrow(this::notFound);
    }
    return toView(indent, ward, bed, loadLineViews(indent.getId()));
  }

  private HospitalIndentView toView(
      HospitalIndent indent,
      HospitalWard ward,
      HospitalBed bed,
      List<HospitalIndentView.LineView> lines) {
    return new HospitalIndentView(
        indent.getId(),
        indent.getIndentNumber(),
        indent.getWardId(),
        ward == null ? null : ward.getName(),
        indent.getBedId(),
        bed == null ? null : bed.getLabel(),
        indent.getPatientName(),
        indent.getNote(),
        indent.getRequestedBy(),
        indent.getRequestedAt(),
        indent.getStatus(),
        indent.getHospitalInvoiceRef(),
        indent.getIssuedAt(),
        indent.getVersion(),
        lines);
  }

  private HospitalIndentView toView(
      BranchContext ctx,
      HospitalIndent indent,
      HospitalWard ward,
      HospitalBed bed,
      List<ResolvedLine> lines) {
    List<HospitalIndentView.LineView> lineViews =
        lines.stream()
            .map(
                line ->
                    new HospitalIndentView.LineView(
                        line.id(),
                        line.product().getId(),
                        line.product().getName(),
                        line.product().getSku(),
                        line.requestedQty(),
                        BigDecimal.ZERO))
            .toList();
    return toView(indent, ward, bed, lineViews);
  }

  private List<HospitalIndentView.LineView> loadLineViews(UUID indentId) {
    return lineRepository.findAllByIndentIdOrderBySortOrderAsc(indentId).stream()
        .map(
            line ->
                new HospitalIndentView.LineView(
                    line.getId(),
                    line.getProductId(),
                    line.getProductName(),
                    line.getSku(),
                    line.getRequestedQty(),
                    line.getIssuedQty()))
        .toList();
  }

  private Map<UUID, HospitalWard> loadWards(BranchContext ctx) {
    return wardRepository
        .findAllByTenantIdAndBranchIdOrderByNameAsc(ctx.tenantId(), ctx.branchId())
        .stream()
        .collect(Collectors.toMap(HospitalWard::getId, Function.identity()));
  }

  private Map<UUID, HospitalBed> loadBeds(BranchContext ctx) {
    return bedRepository
        .findAllByTenantIdAndBranchIdOrderByWardIdAscSequenceNoAsc(ctx.tenantId(), ctx.branchId())
        .stream()
        .collect(Collectors.toMap(HospitalBed::getId, Function.identity()));
  }

  private void persistLines(
      BranchContext ctx, UUID indentId, List<ResolvedLine> lines, Instant now) {
    int sort = 0;
    for (ResolvedLine line : lines) {
      HospitalIndentLine row = new HospitalIndentLine();
      row.setId(line.id());
      row.setTenantId(ctx.tenantId());
      row.setBranchId(ctx.branchId());
      row.setIndentId(indentId);
      row.setProductId(line.product().getId());
      row.setProductName(line.product().getName());
      row.setSku(line.product().getSku());
      row.setRequestedQty(line.requestedQty());
      row.setIssuedQty(BigDecimal.ZERO);
      row.setSortOrder(sort++);
      row.setCreatedAt(now);
      lineRepository.save(row);
    }
  }

  private List<ResolvedLine> resolveLines(UUID tenantId, List<HospitalIndentCommand.Line> lines) {
    if (lines == null || lines.isEmpty()) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          HospitalPolicy.LINES_REQUIRED,
          HospitalPolicy.LINES_REQUIRED_MESSAGE);
    }
    Map<UUID, Product> products = new HashMap<>();
    List<ResolvedLine> resolved = new ArrayList<>();
    for (HospitalIndentCommand.Line line : lines) {
      if (line == null || line.productId() == null) {
        throw validationError();
      }
      Product product =
          products.computeIfAbsent(
              line.productId(),
              id ->
                  productRepository.findByIdAndTenantId(id, tenantId).orElseThrow(this::notFound));
      PurchaseOrderPolicy.assertProductActive(product.isActive(), product.isDiscontinued());
      BigDecimal qty =
          PurchaseOrderPolicy.requireQuantity(line.requestedQty(), product.getQuantityPrecision());
      resolved.add(new ResolvedLine(UUID.randomUUID(), product, qty));
    }
    return resolved;
  }

  private WardBed resolveWardBed(BranchContext ctx, UUID wardId, UUID bedId) {
    if (wardId == null) {
      throw validationError();
    }
    HospitalWard ward =
        wardRepository
            .findByIdAndTenantIdAndBranchId(wardId, ctx.tenantId(), ctx.branchId())
            .orElseThrow(this::notFound);
    HospitalBed bed = null;
    if (bedId != null) {
      bed =
          bedRepository
              .findByIdAndTenantIdAndBranchId(bedId, ctx.tenantId(), ctx.branchId())
              .orElseThrow(this::notFound);
      if (!bed.getWardId().equals(ward.getId())) {
        throw notFound();
      }
    }
    return new WardBed(ward, bed);
  }

  private String nextIndentNumber(BranchContext ctx) {
    HospitalIndentSequence seq =
        sequenceRepository
            .lockByTenantIdAndBranchId(ctx.tenantId(), ctx.branchId())
            .orElseGet(() -> insertSequence(ctx));
    int value = seq.getNextValue();
    seq.setNextValue(value + 1);
    sequenceRepository.save(seq);
    return HospitalPolicy.formatIndent(value);
  }

  private HospitalIndentSequence insertSequence(BranchContext ctx) {
    HospitalIndentSequence seq = new HospitalIndentSequence();
    seq.setId(UUID.randomUUID());
    seq.setTenantId(ctx.tenantId());
    seq.setBranchId(ctx.branchId());
    seq.setNextValue(1);
    try {
      return sequenceRepository.saveAndFlush(seq);
    } catch (DataIntegrityViolationException ex) {
      return sequenceRepository
          .lockByTenantIdAndBranchId(ctx.tenantId(), ctx.branchId())
          .orElseThrow(() -> ex);
    }
  }

  private NormalizedCommand normalize(HospitalIndentCommand command) {
    if (command == null) {
      throw validationError();
    }
    String requestedBy = trimRequired(command.requestedBy(), "requestedBy");
    String patientName = trimOrNull(command.patientName());
    String note = trimOrNull(command.note());
    if (patientName == null && note == null) {
      throw validationError();
    }
    return new NormalizedCommand(
        command.wardId(), command.bedId(), patientName, note, requestedBy, command.lines());
  }

  private HospitalIndent requireIndent(UUID indentId, BranchContext ctx) {
    return indentRepository
        .findByIdAndTenantIdAndBranchId(indentId, ctx.tenantId(), ctx.branchId())
        .orElseThrow(this::notFound);
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

  private BranchContext requireIndentWriter(AuthPrincipal principal) {
    AppUser user = requireTenantUser(principal);
    UUID branchId = requireActiveBranch(principal);
    PlanCode plan = subscriptionService.resolvePlan(user.getTenantId());
    HospitalPolicy.assertEntitled(plan);
    boolean hasHospital = accessQueryService.effectiveModules(user).contains(ModuleCode.HOSPITAL);
    boolean pharmacist =
        accessQueryService.hasAssignedRoleCode(user, HospitalPolicy.PHARMACIST_CODE);
    boolean inventory = accessQueryService.hasAssignedRoleCode(user, HospitalPolicy.INVENTORY_CODE);
    HospitalPolicy.requireIndentWriter(user.getRole(), pharmacist, inventory, hasHospital);
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

  private void audit(BranchContext ctx, String action, UUID indentId) {
    auditService.record(
        new AuditRecordCommand(
            ctx.user().getId(),
            ctx.tenantId(),
            ctx.branchId(),
            action,
            AuditService.OUTCOME_SUCCESS,
            null,
            null,
            null,
            null,
            "{\"indentId\":\"" + indentId + "\"}"));
  }

  private static String trimRequired(String value, String field) {
    if (value == null || value.isBlank()) {
      throw validationError();
    }
    return value.trim();
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

  private record BranchContext(AppUser user, UUID tenantId, UUID branchId) {}

  private record NormalizedCommand(
      UUID wardId,
      UUID bedId,
      String patientName,
      String note,
      String requestedBy,
      List<HospitalIndentCommand.Line> lines) {}

  private record WardBed(HospitalWard ward, HospitalBed bed) {}

  private record ResolvedLine(UUID id, Product product, BigDecimal requestedQty) {}
}
