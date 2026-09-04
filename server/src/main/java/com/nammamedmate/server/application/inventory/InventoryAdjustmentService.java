package com.nammamedmate.server.application.inventory;

import com.nammamedmate.server.application.access.AccessQueryService;
import com.nammamedmate.server.application.approval.ApprovalRequestView;
import com.nammamedmate.server.application.approval.ApprovalService;
import com.nammamedmate.server.application.approval.CreateApprovalRequestCommand;
import com.nammamedmate.server.application.approval.DecideApprovalCommand;
import com.nammamedmate.server.application.audit.AuditRecordCommand;
import com.nammamedmate.server.application.audit.AuditService;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.ApprovalActionKey;
import com.nammamedmate.server.domain.ApprovalDecisionOutcome;
import com.nammamedmate.server.domain.ApprovalRequest;
import com.nammamedmate.server.domain.ModuleCode;
import com.nammamedmate.server.domain.Product;
import com.nammamedmate.server.domain.StockAdjustment;
import com.nammamedmate.server.domain.StockAdjustmentDirection;
import com.nammamedmate.server.domain.StockAdjustmentPolicy;
import com.nammamedmate.server.domain.StockAdjustmentReason;
import com.nammamedmate.server.domain.StockAdjustmentStatus;
import com.nammamedmate.server.domain.StockBalance;
import com.nammamedmate.server.domain.StockBatch;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.ApprovalRequestRepository;
import com.nammamedmate.server.persistence.ProductRepository;
import com.nammamedmate.server.persistence.StockAdjustmentRepository;
import com.nammamedmate.server.persistence.StockBalanceRepository;
import com.nammamedmate.server.persistence.StockBatchRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InventoryAdjustmentService {

  private static final String NO_BRANCH_CODE = "NO_ACTIVE_BRANCH";
  private static final String NO_BRANCH_MESSAGE = "Select an outlet before managing floor stock.";
  private static final List<StockAdjustmentStatus> HISTORY =
      List.of(StockAdjustmentStatus.APPROVED, StockAdjustmentStatus.REJECTED);

  private final AppUserRepository appUserRepository;
  private final AccessQueryService accessQueryService;
  private final ProductRepository productRepository;
  private final StockBatchRepository stockBatchRepository;
  private final StockBalanceRepository stockBalanceRepository;
  private final StockAdjustmentRepository stockAdjustmentRepository;
  private final ApprovalRequestRepository approvalRequestRepository;
  private final ApprovalService approvalService;
  private final AuditService auditService;
  private final Clock clock;

  public InventoryAdjustmentService(
      AppUserRepository appUserRepository,
      AccessQueryService accessQueryService,
      ProductRepository productRepository,
      StockBatchRepository stockBatchRepository,
      StockBalanceRepository stockBalanceRepository,
      StockAdjustmentRepository stockAdjustmentRepository,
      ApprovalRequestRepository approvalRequestRepository,
      ApprovalService approvalService,
      AuditService auditService,
      Clock clock) {
    this.appUserRepository = appUserRepository;
    this.accessQueryService = accessQueryService;
    this.productRepository = productRepository;
    this.stockBatchRepository = stockBatchRepository;
    this.stockBalanceRepository = stockBalanceRepository;
    this.stockAdjustmentRepository = stockAdjustmentRepository;
    this.approvalRequestRepository = approvalRequestRepository;
    this.approvalService = approvalService;
    this.auditService = auditService;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public StockAdjustmentsResult list(AuthPrincipal principal, String scope) {
    Context ctx = requireReady(principal);
    List<StockAdjustment> rows;
    if (scope == null || scope.isBlank() || "pending".equalsIgnoreCase(scope.trim())) {
      rows =
          stockAdjustmentRepository.findByTenantIdAndBranchIdAndStatusOrderByCreatedAtDesc(
              ctx.tenantId(), ctx.branchId(), StockAdjustmentStatus.PENDING);
    } else if ("history".equalsIgnoreCase(scope.trim())) {
      rows =
          stockAdjustmentRepository.findByTenantIdAndBranchIdAndStatusInOrderByCreatedAtDesc(
              ctx.tenantId(), ctx.branchId(), HISTORY);
    } else {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
    return new StockAdjustmentsResult(rows.stream().map(this::toView).toList());
  }

  @Transactional(readOnly = true)
  public StockAdjustmentView get(AuthPrincipal principal, UUID id) {
    Context ctx = requireReady(principal);
    StockAdjustment adjustment =
        stockAdjustmentRepository
            .findByIdAndTenantIdAndBranchId(id, ctx.tenantId(), ctx.branchId())
            .orElseThrow(InventoryAdjustmentService::notFound);
    return toView(adjustment);
  }

  @Transactional
  public StockAdjustmentView create(AuthPrincipal principal, CreateStockAdjustmentCommand command) {
    Context ctx = requireReady(principal);
    if (command == null) {
      throw validationError();
    }
    StockAdjustmentReason reason = StockAdjustmentPolicy.requireReason(command.reason());
    StockAdjustmentDirection direction =
        StockAdjustmentPolicy.requireDirection(reason, command.direction());
    String key = requireIdempotencyKey(command.idempotencyKey());
    Product product = requireProduct(command.productId(), ctx.tenantId());
    BigDecimal quantity =
        StockAdjustmentPolicy.requirePositiveQuantity(
            command.quantity(), product.getQuantityPrecision());
    UUID batchId = requireBatch(product, command.batchId(), ctx.tenantId());

    Optional<StockAdjustment> existing =
        stockAdjustmentRepository.findByTenantIdAndIdempotencyKey(ctx.tenantId(), key);
    if (existing.isPresent()) {
      StockAdjustment prior = existing.get();
      if (!prior.getProductId().equals(product.getId())
          || !Objects.equals(prior.getBatchId(), batchId)
          || prior.getReason() != reason
          || prior.getDirection() != direction
          || prior.getQuantity().compareTo(quantity) != 0) {
        throw new ApiException(
            HttpStatus.CONFLICT,
            "IDEMPOTENCY_CONFLICT",
            "Idempotency key was reused with a different payload");
      }
      return toView(prior);
    }

    if (direction == StockAdjustmentDirection.OUT) {
      StockBalance balance =
          lockBalance(ctx, product.getId(), batchId)
              .orElseThrow(InventoryAdjustmentService::insufficient);
      if (balance.getQuantity().compareTo(quantity) < 0) {
        throw insufficient();
      }
    } else if (batchId != null) {
      stockBatchRepository
          .findByIdAndTenantId(batchId, ctx.tenantId())
          .orElseThrow(
              () -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Batch was not found"));
    }

    Long price =
        batchId == null
            ? null
            : stockBatchRepository
                .findByIdAndTenantId(batchId, ctx.tenantId())
                .map(StockBatch::getPurchasePricePaise)
                .orElse(null);
    int amountValue = amountValue(quantity, price);
    ApprovalRequestView request =
        approvalService.createRequest(
            principal,
            new CreateApprovalRequestCommand(
                ModuleCode.INVENTORY,
                ApprovalActionKey.INVENTORY_WRITE_OFF,
                ctx.branchId(),
                amountValue,
                "{\"reason\":\"" + reason.name() + "\",\"productId\":\"" + product.getId() + "\"}",
                "adj:" + key));

    Instant now = clock.instant();
    StockAdjustment adjustment = new StockAdjustment();
    adjustment.setId(UUID.randomUUID());
    adjustment.setTenantId(ctx.tenantId());
    adjustment.setBranchId(ctx.branchId());
    adjustment.setProductId(product.getId());
    adjustment.setBatchId(batchId);
    adjustment.setReason(reason);
    adjustment.setQuantity(quantity);
    adjustment.setDirection(direction);
    adjustment.setStatus(StockAdjustmentStatus.PENDING);
    adjustment.setRequesterUserId(ctx.userId());
    adjustment.setApprovalRequestId(request.id());
    adjustment.setIdempotencyKey(key);
    adjustment.setVersion(1);
    adjustment.setCreatedAt(now);
    adjustment.setUpdatedAt(now);
    stockAdjustmentRepository.saveAndFlush(adjustment);
    auditService.record(
        new AuditRecordCommand(
            ctx.userId(),
            ctx.tenantId(),
            ctx.branchId(),
            "STOCK_ADJUSTMENT_CREATE",
            AuditService.OUTCOME_SUCCESS,
            null,
            null,
            null,
            null,
            "{\"adjustmentId\":\"" + adjustment.getId() + "\"}"));
    return toView(adjustment);
  }

  @Transactional
  public StockAdjustmentView decide(
      AuthPrincipal principal,
      UUID id,
      ApprovalDecisionOutcome outcome,
      int expectedVersion,
      String note) {
    Context ctx = requireBranchActor(principal);
    if (outcome == null) {
      throw validationError();
    }
    StockAdjustment adjustment =
        stockAdjustmentRepository
            .lockByIdAndTenantIdAndBranchId(id, ctx.tenantId(), ctx.branchId())
            .orElseThrow(InventoryAdjustmentService::notFound);
    if (adjustment.getStatus() != StockAdjustmentStatus.PENDING
        || adjustment.getVersion() != expectedVersion) {
      throw new ApiException(HttpStatus.CONFLICT, "STALE_STATE", "Adjustment is no longer pending");
    }
    ApprovalRequest request =
        approvalRequestRepository
            .findByIdAndTenantId(adjustment.getApprovalRequestId(), ctx.tenantId())
            .orElseThrow(InventoryAdjustmentService::notFound);
    approvalService.decide(
        principal, request.getId(), new DecideApprovalCommand(outcome, note, request.getVersion()));
    return toView(
        stockAdjustmentRepository
            .findByIdAndTenantIdAndBranchId(id, ctx.tenantId(), ctx.branchId())
            .orElseThrow(InventoryAdjustmentService::notFound));
  }

  private StockAdjustmentView toView(StockAdjustment adjustment) {
    Product product =
        productRepository
            .findByIdAndTenantId(adjustment.getProductId(), adjustment.getTenantId())
            .orElse(null);
    StockBatch batch =
        adjustment.getBatchId() == null
            ? null
            : stockBatchRepository
                .findByIdAndTenantId(adjustment.getBatchId(), adjustment.getTenantId())
                .orElse(null);
    return new StockAdjustmentView(
        adjustment.getId(),
        adjustment.getProductId(),
        product == null ? "" : product.getSku(),
        product == null ? "" : product.getName(),
        adjustment.getBatchId(),
        batch == null ? null : batch.getBatchNumber(),
        adjustment.getReason(),
        adjustment.getQuantity(),
        adjustment.getDirection(),
        adjustment.getStatus(),
        adjustment.getRequesterUserId(),
        adjustment.getApproverUserId(),
        adjustment.getApprovalRequestId(),
        adjustment.getVersion(),
        adjustment.getCreatedAt(),
        adjustment.getDecidedAt());
  }

  private UUID requireBatch(Product product, UUID batchId, UUID tenantId) {
    if (product.isRequiresBatchTracking()) {
      if (batchId == null) {
        throw validationError();
      }
      StockBatch batch =
          stockBatchRepository
              .findByIdAndTenantId(batchId, tenantId)
              .filter(row -> row.getProductId().equals(product.getId()))
              .orElseThrow(
                  () -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Batch was not found"));
      return batch.getId();
    }
    if (batchId != null) {
      throw validationError();
    }
    return null;
  }

  private Optional<StockBalance> lockBalance(Context ctx, UUID productId, UUID batchId) {
    if (batchId == null) {
      return stockBalanceRepository.lockByTenantIdAndBranchIdAndProductIdAndBatchIdIsNull(
          ctx.tenantId(), ctx.branchId(), productId);
    }
    return stockBalanceRepository.lockByTenantIdAndBranchIdAndProductIdAndBatchId(
        ctx.tenantId(), ctx.branchId(), productId, batchId);
  }

  private Product requireProduct(UUID productId, UUID tenantId) {
    if (productId == null) {
      throw validationError();
    }
    return productRepository
        .findByIdAndTenantId(productId, tenantId)
        .orElseThrow(
            () -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Product was not found"));
  }

  private Context requireReady(AuthPrincipal principal) {
    UUID tenantId = requireModuleAccess(principal);
    UUID branchId = principal.activeBranchId();
    if (branchId == null) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, NO_BRANCH_CODE, NO_BRANCH_MESSAGE);
    }
    return new Context(tenantId, branchId, principal.userId());
  }

  private Context requireBranchActor(AuthPrincipal principal) {
    if (principal == null || principal.tenantId() == null) {
      throw forbidden();
    }
    if (principal.role() != AppUserRole.pharmacy_owner
        && principal.role() != AppUserRole.pharmacy_staff) {
      throw forbidden();
    }
    UUID branchId = principal.activeBranchId();
    if (branchId == null) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, NO_BRANCH_CODE, NO_BRANCH_MESSAGE);
    }
    return new Context(principal.tenantId(), branchId, principal.userId());
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
            .orElseThrow(InventoryAdjustmentService::forbidden);
    if (!accessQueryService.effectiveModules(user).contains(ModuleCode.INVENTORY)) {
      throw forbidden();
    }
    return principal.tenantId();
  }

  private static String requireIdempotencyKey(String key) {
    if (key == null || key.isBlank() || key.length() > 128) {
      throw validationError();
    }
    return key.trim();
  }

  private static int amountValue(BigDecimal quantity, Long purchasePricePaise) {
    if (purchasePricePaise == null || purchasePricePaise <= 0) {
      return 0;
    }
    return quantity
        .multiply(BigDecimal.valueOf(purchasePricePaise))
        .setScale(0, RoundingMode.HALF_UP)
        .intValue();
  }

  private static ApiException validationError() {
    return new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
  }

  private static ApiException insufficient() {
    return new ApiException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        "INSUFFICIENT_STOCK",
        "Not enough stock for this adjustment.");
  }

  private static ApiException notFound() {
    return new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Adjustment was not found");
  }

  private static ApiException forbidden() {
    return new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Access denied");
  }

  private record Context(UUID tenantId, UUID branchId, UUID userId) {}
}
