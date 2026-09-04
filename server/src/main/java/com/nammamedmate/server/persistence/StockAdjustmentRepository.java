package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.StockAdjustment;
import com.nammamedmate.server.domain.StockAdjustmentStatus;
import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface StockAdjustmentRepository extends JpaRepository<StockAdjustment, UUID> {

  Optional<StockAdjustment> findByTenantIdAndIdempotencyKey(UUID tenantId, String idempotencyKey);

  Optional<StockAdjustment> findByIdAndTenantIdAndBranchId(UUID id, UUID tenantId, UUID branchId);

  List<StockAdjustment> findByTenantIdAndBranchIdAndStatusOrderByCreatedAtDesc(
      UUID tenantId, UUID branchId, StockAdjustmentStatus status);

  List<StockAdjustment> findByTenantIdAndBranchIdAndStatusInOrderByCreatedAtDesc(
      UUID tenantId, UUID branchId, Collection<StockAdjustmentStatus> statuses);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query(
      """
      select a from StockAdjustment a
      where a.id = :id and a.tenantId = :tenantId and a.branchId = :branchId
      """)
  Optional<StockAdjustment> lockByIdAndTenantIdAndBranchId(
      @Param("id") UUID id, @Param("tenantId") UUID tenantId, @Param("branchId") UUID branchId);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select a from StockAdjustment a where a.approvalRequestId = :requestId")
  Optional<StockAdjustment> lockByApprovalRequestId(@Param("requestId") UUID requestId);
}
