package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.StockBalance;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface StockBalanceRepository extends JpaRepository<StockBalance, UUID> {

  List<StockBalance> findAllByTenantIdAndBranchIdOrderByProductIdAsc(UUID tenantId, UUID branchId);

  List<StockBalance> findAllByTenantIdAndBranchIdAndProductId(
      UUID tenantId, UUID branchId, UUID productId);

  Optional<StockBalance> findByTenantIdAndBranchIdAndProductIdAndBatchId(
      UUID tenantId, UUID branchId, UUID productId, UUID batchId);

  @Query(
      """
      select b from StockBalance b
      where b.tenantId = :tenantId
        and b.branchId = :branchId
        and b.productId = :productId
        and b.batchId is null
      """)
  Optional<StockBalance> findByTenantIdAndBranchIdAndProductIdAndBatchIdIsNull(
      @Param("tenantId") UUID tenantId,
      @Param("branchId") UUID branchId,
      @Param("productId") UUID productId);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query(
      """
      select b from StockBalance b
      where b.tenantId = :tenantId
        and b.branchId = :branchId
        and b.productId = :productId
        and b.batchId = :batchId
      """)
  Optional<StockBalance> lockByTenantIdAndBranchIdAndProductIdAndBatchId(
      @Param("tenantId") UUID tenantId,
      @Param("branchId") UUID branchId,
      @Param("productId") UUID productId,
      @Param("batchId") UUID batchId);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query(
      """
      select b from StockBalance b
      where b.tenantId = :tenantId
        and b.branchId = :branchId
        and b.productId = :productId
        and b.batchId is null
      """)
  Optional<StockBalance> lockByTenantIdAndBranchIdAndProductIdAndBatchIdIsNull(
      @Param("tenantId") UUID tenantId,
      @Param("branchId") UUID branchId,
      @Param("productId") UUID productId);
}
