package com.nammamedmate.server.application.finance;

import com.nammamedmate.server.application.access.AccessQueryService;
import com.nammamedmate.server.application.audit.AuditRecordCommand;
import com.nammamedmate.server.application.audit.AuditService;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.Expense;
import com.nammamedmate.server.domain.ExpenseCategory;
import com.nammamedmate.server.domain.ExpenseEvidence;
import com.nammamedmate.server.domain.ExpensePolicy;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.ModuleCode;
import com.nammamedmate.server.infrastructure.finance.ExpenseFileStorage;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.ExpenseCategoryRepository;
import com.nammamedmate.server.persistence.ExpenseEvidenceRepository;
import com.nammamedmate.server.persistence.ExpenseRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.UserBranchRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class ExpenseService {

  private static final Set<String> ALLOWED_TYPES =
      Set.of("application/pdf", "image/jpeg", "image/png");

  private final ExpenseRepository expenseRepository;
  private final ExpenseCategoryRepository categoryRepository;
  private final ExpenseEvidenceRepository evidenceRepository;
  private final LocationRepository locationRepository;
  private final AppUserRepository appUserRepository;
  private final UserBranchRepository userBranchRepository;
  private final AccessQueryService accessQueryService;
  private final AuditService auditService;
  private final ExpenseFileStorage fileStorage;
  private final Clock clock;

  public ExpenseService(
      ExpenseRepository expenseRepository,
      ExpenseCategoryRepository categoryRepository,
      ExpenseEvidenceRepository evidenceRepository,
      LocationRepository locationRepository,
      AppUserRepository appUserRepository,
      UserBranchRepository userBranchRepository,
      AccessQueryService accessQueryService,
      AuditService auditService,
      ExpenseFileStorage fileStorage,
      Clock clock) {
    this.expenseRepository = expenseRepository;
    this.categoryRepository = categoryRepository;
    this.evidenceRepository = evidenceRepository;
    this.locationRepository = locationRepository;
    this.appUserRepository = appUserRepository;
    this.userBranchRepository = userBranchRepository;
    this.accessQueryService = accessQueryService;
    this.auditService = auditService;
    this.fileStorage = fileStorage;
    this.clock = clock;
  }

  @Transactional
  public List<ExpenseCategoryView> listCategories(AuthPrincipal principal) {
    Context ctx = requireFinance(principal);
    ensureSystemCategories();
    return categoryRepository.findAvailableForTenant(ctx.tenantId()).stream()
        .map(this::toCategoryView)
        .toList();
  }

  @Transactional
  public ExpenseCategoryView createCategory(AuthPrincipal principal, String code, String label) {
    Context ctx = requireFinance(principal);
    ensureSystemCategories();
    String normalized = ExpensePolicy.requireCustomCode(code);
    String cleaned = ExpensePolicy.requireLabel(label);
    if (categoryRepository.findByTenantIdAndCode(ctx.tenantId(), normalized).isPresent()) {
      throw ExpensePolicy.categoryTaken();
    }
    Instant now = Instant.now(clock);
    ExpenseCategory row = new ExpenseCategory();
    row.setId(UUID.randomUUID());
    row.setTenantId(ctx.tenantId());
    row.setCode(normalized);
    row.setLabel(cleaned);
    row.setSystem(false);
    row.setCreatedAt(now);
    categoryRepository.saveAndFlush(row);
    audit(principal, "EXPENSE_CATEGORY_CREATE", row.getId(), ctx.sessionBranchId());
    return toCategoryView(row);
  }

  @Transactional(readOnly = true)
  public List<ExpenseView> list(
      AuthPrincipal principal,
      String branchId,
      String scope,
      UUID categoryId,
      LocalDate from,
      LocalDate to) {
    Context ctx = requireFinance(principal);
    List<UUID> branchIds = resolveListBranches(principal, ctx, branchId, scope);
    Map<UUID, String> names = branchNames(ctx.tenantId(), branchIds);
    return expenseRepository.findScoped(ctx.tenantId(), branchIds, categoryId, from, to).stream()
        .map(row -> toView(row, names.get(row.getBranchId())))
        .toList();
  }

  @Transactional(readOnly = true)
  public ExpenseTotalsView totals(
      AuthPrincipal principal,
      String branchId,
      String scope,
      UUID categoryId,
      LocalDate from,
      LocalDate to) {
    Context ctx = requireFinance(principal);
    List<UUID> branchIds = resolveListBranches(principal, ctx, branchId, scope);
    Map<UUID, String> names = branchNames(ctx.tenantId(), branchIds);
    List<Expense> rows =
        expenseRepository.findScoped(ctx.tenantId(), branchIds, categoryId, from, to);
    long total = 0;
    Map<UUID, ExpenseTotalsView.CategoryTotal> byCategory = new LinkedHashMap<>();
    Map<UUID, ExpenseTotalsView.BranchTotal> byBranch = new LinkedHashMap<>();
    for (Expense row : rows) {
      total += row.getAmountPaise();
      byCategory.merge(
          row.getCategoryId(),
          new ExpenseTotalsView.CategoryTotal(
              row.getCategoryId(),
              row.getCategoryCode(),
              row.getCategoryLabel(),
              row.getAmountPaise()),
          (left, right) ->
              new ExpenseTotalsView.CategoryTotal(
                  left.categoryId(),
                  left.code(),
                  left.label(),
                  left.totalPaise() + right.totalPaise()));
      String branchName = names.getOrDefault(row.getBranchId(), "Outlet");
      byBranch.merge(
          row.getBranchId(),
          new ExpenseTotalsView.BranchTotal(row.getBranchId(), branchName, row.getAmountPaise()),
          (left, right) ->
              new ExpenseTotalsView.BranchTotal(
                  left.branchId(), left.branchName(), left.totalPaise() + right.totalPaise()));
    }
    return new ExpenseTotalsView(
        total,
        byCategory.values().stream()
            .sorted(Comparator.comparing(ExpenseTotalsView.CategoryTotal::code))
            .toList(),
        byBranch.values().stream()
            .sorted(Comparator.comparing(ExpenseTotalsView.BranchTotal::branchName))
            .toList());
  }

  @Transactional(readOnly = true)
  public ExpenseView get(AuthPrincipal principal, UUID id) {
    Context ctx = requireFinance(principal);
    Expense row =
        expenseRepository
            .findByIdAndTenantId(id, ctx.tenantId())
            .orElseThrow(ExpensePolicy::notFound);
    requireAccessibleBranch(principal, ctx, row.getBranchId());
    return toView(row, branchName(ctx.tenantId(), row.getBranchId()));
  }

  @Transactional
  public ExpenseView create(AuthPrincipal principal, ExpenseCommand command) {
    Context ctx = requireFinance(principal);
    ensureSystemCategories();
    UUID branchId = resolveWriteBranch(principal, ctx, command.branchId());
    long amount = ExpensePolicy.requireAmountPaise(command.amountPaise());
    LocalDate occurred = ExpensePolicy.requireOccurredOn(command.occurredOn(), today());
    ExpensePolicy.assertPeriodOpen(occurred);
    String notes = ExpensePolicy.requireNotes(command.notes());
    String key = ExpensePolicy.requireIdempotencyKey(command.idempotencyKey());
    if (key != null) {
      Expense existing =
          expenseRepository.findByTenantIdAndIdempotencyKey(ctx.tenantId(), key).orElse(null);
      if (existing != null) {
        return toView(existing, branchName(ctx.tenantId(), existing.getBranchId()));
      }
    }
    ExpenseCategory category = requireCategory(ctx.tenantId(), command.categoryId());
    Instant now = Instant.now(clock);
    Expense row = new Expense();
    row.setId(UUID.randomUUID());
    row.setTenantId(ctx.tenantId());
    row.setBranchId(branchId);
    row.setCategoryId(category.getId());
    row.setCategoryCode(category.getCode());
    row.setCategoryLabel(category.getLabel());
    row.setAmountPaise(amount);
    row.setOccurredOn(occurred);
    row.setNotes(notes);
    row.setIdempotencyKey(key);
    row.setVersion(1);
    row.setCreatedBy(principal.userId());
    row.setCreatedAt(now);
    row.setUpdatedAt(now);
    expenseRepository.saveAndFlush(row);
    audit(principal, "EXPENSE_CREATE", row.getId(), branchId);
    return toView(row, branchName(ctx.tenantId(), branchId));
  }

  @Transactional
  public ExpenseView update(AuthPrincipal principal, UUID id, ExpenseCommand command) {
    Context ctx = requireFinance(principal);
    ensureSystemCategories();
    Expense row =
        expenseRepository
            .findByIdAndTenantId(id, ctx.tenantId())
            .orElseThrow(ExpensePolicy::notFound);
    requireAccessibleBranch(principal, ctx, row.getBranchId());
    ExpensePolicy.requireVersion(row.getVersion(), command.expectedVersion());
    UUID branchId =
        command.branchId() == null
            ? row.getBranchId()
            : resolveWriteBranch(principal, ctx, command.branchId());
    long amount = ExpensePolicy.requireAmountPaise(command.amountPaise());
    LocalDate occurred = ExpensePolicy.requireOccurredOn(command.occurredOn(), today());
    ExpensePolicy.assertPeriodOpen(occurred);
    ExpenseCategory category = requireCategory(ctx.tenantId(), command.categoryId());
    row.setBranchId(branchId);
    row.setCategoryId(category.getId());
    row.setCategoryCode(category.getCode());
    row.setCategoryLabel(category.getLabel());
    row.setAmountPaise(amount);
    row.setOccurredOn(occurred);
    row.setNotes(ExpensePolicy.requireNotes(command.notes()));
    row.setVersion(row.getVersion() + 1);
    row.setUpdatedAt(Instant.now(clock));
    expenseRepository.saveAndFlush(row);
    audit(principal, "EXPENSE_UPDATE", row.getId(), branchId);
    return toView(row, branchName(ctx.tenantId(), branchId));
  }

  @Transactional
  public ExpenseView attachEvidence(AuthPrincipal principal, UUID expenseId, MultipartFile file) {
    Context ctx = requireFinance(principal);
    Expense row =
        expenseRepository
            .findByIdAndTenantId(expenseId, ctx.tenantId())
            .orElseThrow(ExpensePolicy::notFound);
    requireAccessibleBranch(principal, ctx, row.getBranchId());
    MultipartFile evidence = requireEvidence(file);
    UUID evidenceId = UUID.randomUUID();
    ExpenseEvidence stored = new ExpenseEvidence();
    stored.setId(evidenceId);
    stored.setTenantId(ctx.tenantId());
    stored.setExpenseId(row.getId());
    stored.setStorageKey(fileStorage.store(ctx.tenantId(), row.getId(), evidence));
    stored.setContentType(evidence.getContentType());
    stored.setByteSize(evidence.getSize());
    stored.setOriginalFilename(
        evidence.getOriginalFilename() == null ? "receipt" : evidence.getOriginalFilename());
    stored.setUploadedBy(principal.userId());
    stored.setUploadedAt(Instant.now(clock));
    evidenceRepository.saveAndFlush(stored);
    row.setCurrentEvidenceId(evidenceId);
    row.setUpdatedAt(Instant.now(clock));
    expenseRepository.saveAndFlush(row);
    audit(principal, "EXPENSE_UPDATE", row.getId(), row.getBranchId());
    return toView(row, branchName(ctx.tenantId(), row.getBranchId()));
  }

  @Transactional(readOnly = true)
  public ExpenseEvidenceStream openEvidence(
      AuthPrincipal principal, UUID expenseId, UUID evidenceId) {
    Context ctx = requireFinance(principal);
    Expense row =
        expenseRepository
            .findByIdAndTenantId(expenseId, ctx.tenantId())
            .orElseThrow(ExpensePolicy::notFound);
    requireAccessibleBranch(principal, ctx, row.getBranchId());
    ExpenseEvidence evidence =
        evidenceRepository
            .findByIdAndTenantIdAndExpenseId(evidenceId, ctx.tenantId(), expenseId)
            .orElseThrow(ExpensePolicy::notFound);
    return new ExpenseEvidenceStream(
        fileStorage.resolve(evidence.getStorageKey()),
        evidence.getContentType(),
        evidence.getOriginalFilename(),
        evidence.getByteSize());
  }

  private void ensureSystemCategories() {
    Instant now = Instant.now(clock);
    for (Map.Entry<String, String> entry : ExpensePolicy.SYSTEM_LABELS.entrySet()) {
      if (categoryRepository.findByTenantIdIsNullAndCode(entry.getKey()).isPresent()) {
        continue;
      }
      ExpenseCategory row = new ExpenseCategory();
      row.setId(UUID.randomUUID());
      row.setTenantId(null);
      row.setCode(entry.getKey());
      row.setLabel(entry.getValue());
      row.setSystem(true);
      row.setCreatedAt(now);
      categoryRepository.save(row);
    }
    categoryRepository.flush();
  }

  private ExpenseCategory requireCategory(UUID tenantId, UUID categoryId) {
    if (categoryId == null) {
      throw ExpensePolicy.invalidCategory();
    }
    return categoryRepository
        .findById(categoryId)
        .filter(row -> row.getTenantId() == null || tenantId.equals(row.getTenantId()))
        .orElseThrow(ExpensePolicy::invalidCategory);
  }

  private List<UUID> resolveListBranches(
      AuthPrincipal principal, Context ctx, String branchIdRaw, String scope) {
    UUID requested = parseUuid(branchIdRaw);
    if (requested != null) {
      requireAccessibleBranch(principal, ctx, requested);
      return List.of(requested);
    }
    if ("tenant".equalsIgnoreCase(scope == null ? "" : scope.trim())) {
      if (principal.role() != AppUserRole.pharmacy_owner) {
        throw ExpensePolicy.forbidden();
      }
      List<UUID> ids =
          locationRepository
              .findAllByTenantIdAndDeletedAtIsNullOrderByBranchCodeAsc(ctx.tenantId())
              .stream()
              .map(Location::getId)
              .toList();
      if (ids.isEmpty()) {
        throw ExpensePolicy.notFound();
      }
      return ids;
    }
    if (ctx.sessionBranchId() == null) {
      throw ExpensePolicy.noActiveBranch();
    }
    requireAccessibleBranch(principal, ctx, ctx.sessionBranchId());
    return List.of(ctx.sessionBranchId());
  }

  private UUID resolveWriteBranch(AuthPrincipal principal, Context ctx, UUID requested) {
    UUID branchId = requested == null ? ctx.sessionBranchId() : requested;
    if (branchId == null) {
      throw ExpensePolicy.noActiveBranch();
    }
    requireAccessibleBranch(principal, ctx, branchId);
    return branchId;
  }

  private void requireAccessibleBranch(AuthPrincipal principal, Context ctx, UUID branchId) {
    Location branch =
        locationRepository
            .findByIdAndTenantIdAndDeletedAtIsNull(branchId, ctx.tenantId())
            .orElseThrow(ExpensePolicy::notFound);
    if (principal.role() == AppUserRole.pharmacy_owner) {
      return;
    }
    if (!userBranchRepository.existsByTenantIdAndUserIdAndBranchId(
        ctx.tenantId(), principal.userId(), branch.getId())) {
      throw ExpensePolicy.notFound();
    }
  }

  private Context requireFinance(AuthPrincipal principal) {
    if (principal == null || principal.tenantId() == null) {
      throw ExpensePolicy.forbidden();
    }
    if (principal.role() != AppUserRole.pharmacy_owner
        && principal.role() != AppUserRole.pharmacy_staff) {
      throw ExpensePolicy.forbidden();
    }
    AppUser user =
        appUserRepository
            .findById(principal.userId())
            .filter(row -> row.getDeletedAt() == null)
            .orElseThrow(ExpensePolicy::forbidden);
    if (!accessQueryService.effectiveModules(user).contains(ModuleCode.FINANCE)) {
      throw ExpensePolicy.forbidden();
    }
    return new Context(principal.tenantId(), principal.activeBranchId());
  }

  private Map<UUID, String> branchNames(UUID tenantId, List<UUID> branchIds) {
    Map<UUID, String> names = new LinkedHashMap<>();
    for (UUID branchId : branchIds) {
      names.put(branchId, branchName(tenantId, branchId));
    }
    return names;
  }

  private String branchName(UUID tenantId, UUID branchId) {
    return locationRepository
        .findByIdAndTenantIdAndDeletedAtIsNull(branchId, tenantId)
        .map(Location::getName)
        .orElse("Outlet");
  }

  private ExpenseView toView(Expense row, String branchName) {
    List<ExpenseView.EvidenceView> evidence =
        evidenceRepository
            .findAllByTenantIdAndExpenseIdOrderByUploadedAtAsc(row.getTenantId(), row.getId())
            .stream()
            .map(
                item ->
                    new ExpenseView.EvidenceView(
                        item.getId(),
                        item.getContentType(),
                        item.getByteSize(),
                        item.getOriginalFilename(),
                        item.getUploadedAt()))
            .toList();
    return new ExpenseView(
        row.getId(),
        row.getTenantId(),
        row.getBranchId(),
        branchName,
        row.getCategoryId(),
        row.getCategoryCode(),
        row.getCategoryLabel(),
        row.getAmountPaise(),
        row.getOccurredOn(),
        row.getNotes(),
        row.getCurrentEvidenceId(),
        row.getVersion(),
        row.getCreatedAt(),
        row.getUpdatedAt(),
        evidence);
  }

  private ExpenseCategoryView toCategoryView(ExpenseCategory row) {
    return new ExpenseCategoryView(
        row.getId(), row.getTenantId(), row.getCode(), row.getLabel(), row.isSystem());
  }

  private MultipartFile requireEvidence(MultipartFile file) {
    if (file == null || file.isEmpty()) {
      throw ExpensePolicy.shape();
    }
    String contentType = file.getContentType();
    if (contentType == null || !ALLOWED_TYPES.contains(contentType)) {
      throw ExpensePolicy.unsupportedFile();
    }
    return file;
  }

  private void audit(AuthPrincipal principal, String action, UUID expenseId, UUID branchId) {
    auditService.record(
        new AuditRecordCommand(
            principal.userId(),
            principal.tenantId(),
            branchId,
            action,
            AuditService.OUTCOME_SUCCESS,
            null,
            null,
            null,
            principal.sessionId(),
            "{\"expenseId\":\"" + expenseId + "\"}"));
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
      throw ExpensePolicy.shape();
    }
  }

  private record Context(UUID tenantId, UUID sessionBranchId) {}
}
