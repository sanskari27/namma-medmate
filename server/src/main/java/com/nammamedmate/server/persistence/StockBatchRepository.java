package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.StockBatch;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface StockBatchRepository extends JpaRepository<StockBatch, UUID> {

  Optional<StockBatch> findByIdAndTenantId(UUID id, UUID tenantId);

  Optional<StockBatch> findByTenantIdAndProductIdAndBatchNumber(
      UUID tenantId, UUID productId, String batchNumber);

  List<StockBatch> findAllByTenantIdAndIdIn(UUID tenantId, Collection<UUID> ids);

  List<StockBatch> findAllByTenantIdAndProductIdOrderByExpiresOnAscBatchNumberAsc(
      UUID tenantId, UUID productId);

  List<StockBatch> findAllByTenantIdAndBatchNumber(UUID tenantId, String batchNumber);

  @Query(
      """
      select b from StockBatch b
      where b.tenantId = :tenantId
        and b.productId = :productId
        and b.purchasePricePaise > :minPrice
        and exists (
          select 1 from StockBalance s
          where s.tenantId = b.tenantId
            and s.branchId = :branchId
            and s.productId = b.productId
            and s.batchId = b.id
        )
      order by b.createdAt desc
      """)
  List<StockBatch> findPricedBatchesAtBranchOrderByCreatedAtDesc(
      @Param("tenantId") UUID tenantId,
      @Param("branchId") UUID branchId,
      @Param("productId") UUID productId,
      @Param("minPrice") long minPrice);
}
