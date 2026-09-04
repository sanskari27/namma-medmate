package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.StockMovement;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface StockMovementRepository extends JpaRepository<StockMovement, UUID> {

  Optional<StockMovement> findByTenantIdAndIdempotencyKey(UUID tenantId, String idempotencyKey);

  List<StockMovement> findAllByTenantIdAndBranchIdOrderByOccurredAtDesc(
      UUID tenantId, UUID branchId);

  @Query(
      """
      select m from StockMovement m
      where m.tenantId = :tenantId
        and m.branchId = :branchId
        and (:productId is null or m.productId = :productId)
        and (:batchId is null or m.batchId = :batchId)
      order by m.occurredAt desc
      """)
  List<StockMovement> findFiltered(
      @Param("tenantId") UUID tenantId,
      @Param("branchId") UUID branchId,
      @Param("productId") UUID productId,
      @Param("batchId") UUID batchId);
}
