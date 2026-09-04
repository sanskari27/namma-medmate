package com.nammamedmate.server.application.inventory;

import com.nammamedmate.server.application.approval.ApprovalDecisionListener;
import com.nammamedmate.server.application.audit.AuditRecordCommand;
import com.nammamedmate.server.application.audit.AuditService;
import com.nammamedmate.server.domain.ApprovalDecisionOutcome;
import com.nammamedmate.server.domain.StockAdjustment;
import com.nammamedmate.server.domain.StockAdjustmentDirection;
import com.nammamedmate.server.domain.StockAdjustmentStatus;
import com.nammamedmate.server.domain.StockBalance;
import com.nammamedmate.server.domain.StockBatch;
import com.nammamedmate.server.domain.StockMovement;
import com.nammamedmate.server.domain.StockMovementType;
import com.nammamedmate.server.persistence.StockAdjustmentRepository;
import com.nammamedmate.server.persistence.StockBalanceRepository;
import com.nammamedmate.server.persistence.StockBatchRepository;
import com.nammamedmate.server.persistence.StockMovementRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class InventoryAdjustmentApplier implements ApprovalDecisionListener {

  private final StockAdjustmentRepository stockAdjustmentRepository;
  private final StockBalanceRepository stockBalanceRepository;
  private final StockBatchRepository stockBatchRepository;
  private final StockMovementRepository stockMovementRepository;
  private final AuditService auditService;
  private final Clock clock;

  public InventoryAdjustmentApplier(
      StockAdjustmentRepository stockAdjustmentRepository,
      StockBalanceRepository stockBalanceRepository,
      StockBatchRepository stockBatchRepository,
      StockMovementRepository stockMovementRepository,
      AuditService auditService,
      Clock clock) {
    this.stockAdjustmentRepository = stockAdjustmentRepository;
    this.stockBalanceRepository = stockBalanceRepository;
    this.stockBatchRepository = stockBatchRepository;
    this.stockMovementRepository = stockMovementRepository;
    this.auditService = auditService;
    this.clock = clock;
  }

  @Override
  @Transactional
  public void onDecided(
      UUID requestId, ApprovalDecisionOutcome outcome, UUID actorUserId, Instant decidedAt) {
    Optional<StockAdjustment> locked = stockAdjustmentRepository.lockByApprovalRequestId(requestId);
    if (locked.isEmpty()) {
      return;
    }
    StockAdjustment adjustment = locked.get();
    if (adjustment.getStatus() != StockAdjustmentStatus.PENDING) {
      return;
    }
    Instant now = decidedAt == null ? clock.instant() : decidedAt;
    if (outcome == ApprovalDecisionOutcome.REJECTED) {
      markDecided(adjustment, StockAdjustmentStatus.REJECTED, actorUserId, now);
      audit(adjustment, actorUserId, "STOCK_ADJUSTMENT_REJECT");
      return;
    }
    applyStock(adjustment, actorUserId, now);
    markDecided(adjustment, StockAdjustmentStatus.APPROVED, actorUserId, now);
    audit(adjustment, actorUserId, "STOCK_ADJUSTMENT_APPLY");
  }

  private void applyStock(StockAdjustment adjustment, UUID actorUserId, Instant now) {
    String movementKey = "adj:" + adjustment.getId();
    Optional<StockMovement> existing =
        stockMovementRepository.findByTenantIdAndIdempotencyKey(
            adjustment.getTenantId(), movementKey);
    if (existing.isPresent()) {
      return;
    }
    Long price =
        adjustment.getBatchId() == null
            ? null
            : stockBatchRepository
                .findByIdAndTenantId(adjustment.getBatchId(), adjustment.getTenantId())
                .map(StockBatch::getPurchasePricePaise)
                .orElse(null);
    StockBalance balance = lockOrCreateBalance(adjustment);
    BigDecimal next;
    StockMovementType type;
    if (adjustment.getDirection() == StockAdjustmentDirection.OUT) {
      if (balance.getQuantity().compareTo(adjustment.getQuantity()) < 0) {
        throw new ApiException(
            HttpStatus.UNPROCESSABLE_ENTITY,
            "INSUFFICIENT_STOCK",
            "Not enough stock for this adjustment.");
      }
      next = balance.getQuantity().subtract(adjustment.getQuantity());
      type = StockMovementType.ADJUSTMENT_OUT;
    } else {
      next = balance.getQuantity().add(adjustment.getQuantity());
      type = StockMovementType.ADJUSTMENT_IN;
    }
    balance.setQuantity(next);
    balance.setVersion(balance.getVersion() + 1);
    balance.setUpdatedAt(now);
    stockBalanceRepository.saveAndFlush(balance);

    StockMovement movement = new StockMovement();
    movement.setId(UUID.randomUUID());
    movement.setTenantId(adjustment.getTenantId());
    movement.setBranchId(adjustment.getBranchId());
    movement.setProductId(adjustment.getProductId());
    movement.setBatchId(adjustment.getBatchId());
    movement.setBalanceId(balance.getId());
    movement.setType(type);
    movement.setQuantity(adjustment.getQuantity());
    movement.setBalanceAfter(next);
    movement.setPurchasePricePaise(price);
    movement.setIdempotencyKey(movementKey);
    movement.setCreatedByUserId(actorUserId);
    movement.setOccurredAt(now);
    movement.setCreatedAt(now);
    stockMovementRepository.saveAndFlush(movement);
  }

  private StockBalance lockOrCreateBalance(StockAdjustment adjustment) {
    Optional<StockBalance> locked =
        adjustment.getBatchId() == null
            ? stockBalanceRepository.lockByTenantIdAndBranchIdAndProductIdAndBatchIdIsNull(
                adjustment.getTenantId(), adjustment.getBranchId(), adjustment.getProductId())
            : stockBalanceRepository.lockByTenantIdAndBranchIdAndProductIdAndBatchId(
                adjustment.getTenantId(),
                adjustment.getBranchId(),
                adjustment.getProductId(),
                adjustment.getBatchId());
    if (locked.isPresent()) {
      return locked.get();
    }
    if (adjustment.getDirection() != StockAdjustmentDirection.IN) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          "INSUFFICIENT_STOCK",
          "Not enough stock for this adjustment.");
    }
    Instant now = clock.instant();
    StockBalance balance = new StockBalance();
    balance.setId(UUID.randomUUID());
    balance.setTenantId(adjustment.getTenantId());
    balance.setBranchId(adjustment.getBranchId());
    balance.setProductId(adjustment.getProductId());
    balance.setBatchId(adjustment.getBatchId());
    balance.setQuantity(BigDecimal.ZERO);
    balance.setVersion(0L);
    balance.setCreatedAt(now);
    balance.setUpdatedAt(now);
    return stockBalanceRepository.saveAndFlush(balance);
  }

  private void markDecided(
      StockAdjustment adjustment, StockAdjustmentStatus status, UUID actorUserId, Instant now) {
    adjustment.setStatus(status);
    adjustment.setApproverUserId(actorUserId);
    adjustment.setDecidedAt(now);
    adjustment.setUpdatedAt(now);
    adjustment.setVersion(adjustment.getVersion() + 1);
    stockAdjustmentRepository.saveAndFlush(adjustment);
  }

  private void audit(StockAdjustment adjustment, UUID actorUserId, String action) {
    auditService.record(
        new AuditRecordCommand(
            actorUserId,
            adjustment.getTenantId(),
            adjustment.getBranchId(),
            action,
            AuditService.OUTCOME_SUCCESS,
            null,
            null,
            null,
            null,
            "{\"adjustmentId\":\"" + adjustment.getId() + "\"}"));
  }
}
