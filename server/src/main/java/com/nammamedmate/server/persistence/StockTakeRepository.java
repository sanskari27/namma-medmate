package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.StockTake;
import com.nammamedmate.server.domain.StockTakeStatus;
import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface StockTakeRepository extends JpaRepository<StockTake, UUID> {

  Optional<StockTake> findByTenantIdAndIdempotencyKey(UUID tenantId, String idempotencyKey);

  Optional<StockTake> findByIdAndTenantIdAndBranchId(UUID id, UUID tenantId, UUID branchId);

  List<StockTake> findByTenantIdAndBranchIdAndStatusOrderByCreatedAtDesc(
      UUID tenantId, UUID branchId, StockTakeStatus status);

  List<StockTake> findByTenantIdAndBranchIdAndStatusInOrderByCreatedAtDesc(
      UUID tenantId, UUID branchId, Collection<StockTakeStatus> statuses);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query(
      """
      select t from StockTake t
      where t.id = :id and t.tenantId = :tenantId and t.branchId = :branchId
      """)
  Optional<StockTake> lockByIdAndTenantIdAndBranchId(
      @Param("id") UUID id, @Param("tenantId") UUID tenantId, @Param("branchId") UUID branchId);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query(
      """
      select t from StockTake t
      where t.tenantId = :tenantId and t.branchId = :branchId and t.status = :status
      """)
  Optional<StockTake> lockOpenByTenantIdAndBranchId(
      @Param("tenantId") UUID tenantId,
      @Param("branchId") UUID branchId,
      @Param("status") StockTakeStatus status);
}
