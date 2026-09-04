package com.nammamedmate.server.application.inventory;

import com.nammamedmate.server.application.access.AccessQueryService;
import com.nammamedmate.server.application.audit.AuditRecordCommand;
import com.nammamedmate.server.application.audit.AuditService;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.ModuleCode;
import com.nammamedmate.server.domain.Product;
import com.nammamedmate.server.domain.StockAdjustmentDirection;
import com.nammamedmate.server.domain.StockBalance;
import com.nammamedmate.server.domain.StockBatch;
import com.nammamedmate.server.domain.StockTake;
import com.nammamedmate.server.domain.StockTakeLine;
import com.nammamedmate.server.domain.StockTakePolicy;
import com.nammamedmate.server.domain.StockTakeStatus;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.ProductRepository;
import com.nammamedmate.server.persistence.StockBalanceRepository;
import com.nammamedmate.server.persistence.StockBatchRepository;
import com.nammamedmate.server.persistence.StockTakeLineRepository;
import com.nammamedmate.server.persistence.StockTakeRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StockTakeService {

  private static final String NO_BRANCH_CODE = "NO_ACTIVE_BRANCH";
  private static final String NO_BRANCH_MESSAGE = "Select an outlet before managing floor stock.";
  private static final List<StockTakeStatus> HISTORY =
      List.of(StockTakeStatus.POSTED, StockTakeStatus.CANCELLED);

  private final AppUserRepository appUserRepository;
  private final AccessQueryService accessQueryService;
  private final ProductRepository productRepository;
  private final StockBatchRepository stockBatchRepository;
  private final StockBalanceRepository stockBalanceRepository;
  private final StockTakeRepository stockTakeRepository;
  private final StockTakeLineRepository stockTakeLineRepository;
  private final InventoryAdjustmentService inventoryAdjustmentService;
  private final AuditService auditService;
  private final Clock clock;

  public StockTakeService(
      AppUserRepository appUserRepository,
      AccessQueryService accessQueryService,
      ProductRepository productRepository,
      StockBatchRepository stockBatchRepository,
      StockBalanceRepository stockBalanceRepository,
      StockTakeRepository stockTakeRepository,
      StockTakeLineRepository stockTakeLineRepository,
      InventoryAdjustmentService inventoryAdjustmentService,
      AuditService auditService,
      Clock clock) {
    this.appUserRepository = appUserRepository;
    this.accessQueryService = accessQueryService;
    this.productRepository = productRepository;
    this.stockBatchRepository = stockBatchRepository;
    this.stockBalanceRepository = stockBalanceRepository;
    this.stockTakeRepository = stockTakeRepository;
    this.stockTakeLineRepository = stockTakeLineRepository;
    this.inventoryAdjustmentService = inventoryAdjustmentService;
    this.auditService = auditService;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public StockTakesResult list(AuthPrincipal principal, String scope) {
    Context ctx = requireReady(principal);
    List<StockTake> rows;
    if (scope == null || scope.isBlank() || "open".equalsIgnoreCase(scope.trim())) {
      rows =
          stockTakeRepository.findByTenantIdAndBranchIdAndStatusOrderByCreatedAtDesc(
              ctx.tenantId(), ctx.branchId(), StockTakeStatus.OPEN);
    } else if ("history".equalsIgnoreCase(scope.trim())) {
      rows =
          stockTakeRepository.findByTenantIdAndBranchIdAndStatusInOrderByCreatedAtDesc(
              ctx.tenantId(), ctx.branchId(), HISTORY);
    } else {
      throw validationError();
    }
    return new StockTakesResult(rows.stream().map(this::toView).toList());
  }

  @Transactional(readOnly = true)
  public StockTakeView get(AuthPrincipal principal, UUID id) {
    Context ctx = requireReady(principal);
    StockTake take =
        stockTakeRepository
            .findByIdAndTenantIdAndBranchId(id, ctx.tenantId(), ctx.branchId())
            .orElseThrow(StockTakeService::notFound);
    return toView(take);
  }

  @Transactional
  public StockTakeView start(AuthPrincipal principal, CreateStockTakeCommand command) {
    Context ctx = requireReady(principal);
    StockTakePolicy.requireOwnerStart(principal.role());
    if (command == null) {
      throw validationError();
    }
    String key = requireIdempotencyKey(command.idempotencyKey());
    Optional<StockTake> existing =
        stockTakeRepository.findByTenantIdAndIdempotencyKey(ctx.tenantId(), key);
    if (existing.isPresent()) {
      StockTake prior = existing.get();
      if (!prior.getBranchId().equals(ctx.branchId())) {
        throw new ApiException(
            HttpStatus.CONFLICT,
            "IDEMPOTENCY_CONFLICT",
            "Idempotency key was reused with a different payload");
      }
      return toView(prior);
    }
    stockTakeRepository
        .lockOpenByTenantIdAndBranchId(ctx.tenantId(), ctx.branchId(), StockTakeStatus.OPEN)
        .ifPresent(
            open -> {
              throw overlapping();
            });
    Instant now = clock.instant();
    StockTake take = new StockTake();
    take.setId(UUID.randomUUID());
    take.setTenantId(ctx.tenantId());
    take.setBranchId(ctx.branchId());
    take.setStatus(StockTakeStatus.OPEN);
    take.setStartedByUserId(ctx.userId());
    take.setIdempotencyKey(key);
    take.setVersion(1);
    take.setCreatedAt(now);
    take.setUpdatedAt(now);
    try {
      stockTakeRepository.saveAndFlush(take);
    } catch (DataIntegrityViolationException ex) {
      Optional<StockTake> raced =
          stockTakeRepository.findByTenantIdAndIdempotencyKey(ctx.tenantId(), key);
      if (raced.isPresent() && raced.get().getBranchId().equals(ctx.branchId())) {
        return toView(raced.get());
      }
      throw overlapping();
    }
    List<StockBalance> balances =
        stockBalanceRepository.findAllByTenantIdAndBranchIdOrderByProductIdAsc(
            ctx.tenantId(), ctx.branchId());
    for (StockBalance balance : balances) {
      StockTakeLine line = new StockTakeLine();
      line.setId(UUID.randomUUID());
      line.setTenantId(ctx.tenantId());
      line.setStockTakeId(take.getId());
      line.setProductId(balance.getProductId());
      line.setBatchId(balance.getBatchId());
      line.setExpectedQuantity(balance.getQuantity());
      line.setCreatedAt(now);
      line.setUpdatedAt(now);
      stockTakeLineRepository.save(line);
    }
    stockTakeLineRepository.flush();
    audit(ctx, "STOCK_TAKE_START", "{\"stockTakeId\":\"" + take.getId() + "\"}");
    return toView(take);
  }

  @Transactional
  public StockTakeView saveCounts(
      AuthPrincipal principal, UUID id, SaveStockTakeCountsCommand command) {
    Context ctx = requireReady(principal);
    if (command == null || command.lines() == null) {
      throw validationError();
    }
    StockTake take =
        stockTakeRepository
            .lockByIdAndTenantIdAndBranchId(id, ctx.tenantId(), ctx.branchId())
            .orElseThrow(StockTakeService::notFound);
    StockTakePolicy.requireOpen(take.getStatus());
    Instant now = clock.instant();
    for (SaveStockTakeCountsCommand.Line update : command.lines()) {
      if (update == null || update.lineId() == null) {
        throw validationError();
      }
      StockTakeLine line =
          stockTakeLineRepository
              .lockByIdAndTenantIdAndStockTakeId(update.lineId(), ctx.tenantId(), take.getId())
              .orElseThrow(StockTakeService::lineNotFound);
      Product product =
          productRepository
              .findByIdAndTenantId(line.getProductId(), ctx.tenantId())
              .orElseThrow(StockTakeService::notFound);
      line.setCountedQuantity(
          StockTakePolicy.requireCountedQuantity(
              update.countedQuantity(), product.getQuantityPrecision()));
      line.setCountedByUserId(ctx.userId());
      line.setCountedAt(now);
      line.setUpdatedAt(now);
    }
    take.setUpdatedAt(now);
    stockTakeRepository.save(take);
    audit(ctx, "STOCK_TAKE_COUNT", "{\"stockTakeId\":\"" + take.getId() + "\"}");
    return toView(take);
  }

  @Transactional
  public StockTakeView post(AuthPrincipal principal, UUID id) {
    Context ctx = requireReady(principal);
    StockTake take =
        stockTakeRepository
            .lockByIdAndTenantIdAndBranchId(id, ctx.tenantId(), ctx.branchId())
            .orElseThrow(StockTakeService::notFound);
    if (take.getStatus() == StockTakeStatus.POSTED) {
      return toView(take);
    }
    StockTakePolicy.requireOpen(take.getStatus());
    List<StockTakeLine> lines =
        stockTakeLineRepository.findAllByTenantIdAndStockTakeIdOrderByCreatedAtAsc(
            ctx.tenantId(), take.getId());
    for (StockTakeLine line : lines) {
      StockTakePolicy.requireComplete(line.getCountedQuantity());
      BigDecimal live = liveQuantity(ctx, line);
      if (live.compareTo(line.getExpectedQuantity()) != 0) {
        throw new ApiException(
            HttpStatus.CONFLICT,
            "STALE_SNAPSHOT",
            "Book quantity changed after this count started. Cancel and start again.");
      }
    }
    Instant now = clock.instant();
    for (StockTakeLine line : lines) {
      BigDecimal variance =
          StockTakePolicy.variance(line.getExpectedQuantity(), line.getCountedQuantity());
      StockAdjustmentDirection direction = StockTakePolicy.directionForVariance(variance);
      if (direction == null) {
        continue;
      }
      StockAdjustmentView created =
          inventoryAdjustmentService.create(
              principal,
              new CreateStockAdjustmentCommand(
                  line.getProductId(),
                  line.getBatchId(),
                  "PHYSICAL_COUNT",
                  StockTakePolicy.adjustmentQuantity(variance),
                  direction.name(),
                  "take:" + take.getId() + ":line:" + line.getId()));
      line.setAdjustmentId(created.id());
      line.setUpdatedAt(now);
    }
    take.setStatus(StockTakeStatus.POSTED);
    take.setPostedByUserId(ctx.userId());
    take.setPostedAt(now);
    take.setUpdatedAt(now);
    take.setVersion(take.getVersion() + 1);
    stockTakeRepository.save(take);
    audit(ctx, "STOCK_TAKE_POST", "{\"stockTakeId\":\"" + take.getId() + "\"}");
    return toView(take);
  }

  @Transactional
  public StockTakeView cancel(AuthPrincipal principal, UUID id) {
    Context ctx = requireReady(principal);
    StockTakePolicy.requireOwnerStart(principal.role());
    StockTake take =
        stockTakeRepository
            .lockByIdAndTenantIdAndBranchId(id, ctx.tenantId(), ctx.branchId())
            .orElseThrow(StockTakeService::notFound);
    if (take.getStatus() == StockTakeStatus.CANCELLED) {
      return toView(take);
    }
    StockTakePolicy.requireOpen(take.getStatus());
    Instant now = clock.instant();
    take.setStatus(StockTakeStatus.CANCELLED);
    take.setCancelledByUserId(ctx.userId());
    take.setCancelledAt(now);
    take.setUpdatedAt(now);
    take.setVersion(take.getVersion() + 1);
    stockTakeRepository.save(take);
    audit(ctx, "STOCK_TAKE_CANCEL", "{\"stockTakeId\":\"" + take.getId() + "\"}");
    return toView(take);
  }

  private BigDecimal liveQuantity(Context ctx, StockTakeLine line) {
    Optional<StockBalance> locked =
        line.getBatchId() == null
            ? stockBalanceRepository.lockByTenantIdAndBranchIdAndProductIdAndBatchIdIsNull(
                ctx.tenantId(), ctx.branchId(), line.getProductId())
            : stockBalanceRepository.lockByTenantIdAndBranchIdAndProductIdAndBatchId(
                ctx.tenantId(), ctx.branchId(), line.getProductId(), line.getBatchId());
    return locked.map(StockBalance::getQuantity).orElse(BigDecimal.ZERO);
  }

  private StockTakeView toView(StockTake take) {
    List<StockTakeLine> lines =
        stockTakeLineRepository.findAllByTenantIdAndStockTakeIdOrderByCreatedAtAsc(
            take.getTenantId(), take.getId());
    return new StockTakeView(
        take.getId(),
        take.getBranchId(),
        take.getStatus().name(),
        take.getStartedByUserId(),
        take.getPostedByUserId(),
        take.getCancelledByUserId(),
        take.getVersion(),
        take.getCreatedAt(),
        take.getUpdatedAt(),
        take.getPostedAt(),
        lines.stream().map(line -> toLineView(line, take.getTenantId())).toList());
  }

  private StockTakeLineView toLineView(StockTakeLine line, UUID tenantId) {
    Product product =
        productRepository.findByIdAndTenantId(line.getProductId(), tenantId).orElse(null);
    StockBatch batch =
        line.getBatchId() == null
            ? null
            : stockBatchRepository.findByIdAndTenantId(line.getBatchId(), tenantId).orElse(null);
    BigDecimal variance =
        line.getCountedQuantity() == null
            ? null
            : StockTakePolicy.variance(line.getExpectedQuantity(), line.getCountedQuantity());
    StockAdjustmentDirection direction =
        variance == null ? null : StockTakePolicy.directionForVariance(variance);
    return new StockTakeLineView(
        line.getId(),
        line.getProductId(),
        product == null ? "" : product.getSku(),
        product == null ? "" : product.getName(),
        line.getBatchId(),
        batch == null ? null : batch.getBatchNumber(),
        batch == null ? null : batch.getExpiresOn(),
        line.getExpectedQuantity(),
        line.getCountedQuantity(),
        line.getCountedAt(),
        line.getCountedByUserId(),
        line.getAdjustmentId(),
        variance,
        direction == null ? null : direction.name());
  }

  private Context requireReady(AuthPrincipal principal) {
    UUID tenantId = requireModuleAccess(principal);
    UUID branchId = principal.activeBranchId();
    if (branchId == null) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, NO_BRANCH_CODE, NO_BRANCH_MESSAGE);
    }
    return new Context(tenantId, branchId, principal.userId());
  }

  private UUID requireModuleAccess(AuthPrincipal principal) {
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
            .orElseThrow(StockTakeService::forbidden);
    if (!accessQueryService.effectiveModules(user).contains(ModuleCode.INVENTORY)) {
      throw forbidden();
    }
    return principal.tenantId();
  }

  private void audit(Context ctx, String action, String contextJson) {
    auditService.record(
        new AuditRecordCommand(
            ctx.userId(),
            ctx.tenantId(),
            ctx.branchId(),
            action,
            AuditService.OUTCOME_SUCCESS,
            null,
            null,
            null,
            null,
            contextJson));
  }

  private static String requireIdempotencyKey(String key) {
    if (key == null || key.isBlank() || key.length() > 128) {
      throw validationError();
    }
    return key.trim();
  }

  private static ApiException overlapping() {
    return new ApiException(
        HttpStatus.CONFLICT,
        "OVERLAPPING_SESSION",
        "This outlet already has an open physical count.");
  }

  private static ApiException validationError() {
    return new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
  }

  private static ApiException notFound() {
    return new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Stock take was not found");
  }

  private static ApiException lineNotFound() {
    return new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Count line was not found");
  }

  private static ApiException forbidden() {
    return new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Access denied");
  }

  private record Context(UUID tenantId, UUID branchId, UUID userId) {}
}
