package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.GoodsReceipt;
import com.nammamedmate.server.domain.GoodsReceiptStatus;
import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface GoodsReceiptRepository extends JpaRepository<GoodsReceipt, UUID> {

  Optional<GoodsReceipt> findByTenantIdAndBranchIdAndIdempotencyKey(
      UUID tenantId, UUID branchId, String idempotencyKey);

  Optional<GoodsReceipt> findByTenantIdAndBranchIdAndReceiptReference(
      UUID tenantId, UUID branchId, String receiptReference);

  Optional<GoodsReceipt> findByIdAndTenantIdAndBranchId(UUID id, UUID tenantId, UUID branchId);

  Optional<GoodsReceipt> findByTenantIdAndBranchIdAndQcIdempotencyKey(
      UUID tenantId, UUID branchId, String qcIdempotencyKey);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query(
      """
      select r from GoodsReceipt r
      where r.id = :id and r.tenantId = :tenantId and r.branchId = :branchId
      """)
  Optional<GoodsReceipt> lockByIdAndTenantIdAndBranchId(
      @Param("id") UUID id, @Param("tenantId") UUID tenantId, @Param("branchId") UUID branchId);

  List<GoodsReceipt> findAllByPurchaseOrderIdAndTenantIdAndBranchIdOrderByCreatedAtAsc(
      UUID purchaseOrderId, UUID tenantId, UUID branchId);

  List<GoodsReceipt> findAllByTenantIdAndBranchIdOrderByCreatedAtDesc(UUID tenantId, UUID branchId);

  long countByTenantIdAndBranchIdAndReceiptNumberStartingWith(
      UUID tenantId, UUID branchId, String receiptNumber);

  @Query(
      """
      select r from GoodsReceipt r
      where r.tenantId = :tenantId
        and r.branchId in :branchIds
        and r.status = :status
        and r.checkedAt >= :from
        and r.checkedAt < :toExclusive
      order by r.checkedAt asc
      """)
  List<GoodsReceipt> findCheckedInWindow(
      @Param("tenantId") UUID tenantId,
      @Param("branchIds") Collection<UUID> branchIds,
      @Param("status") GoodsReceiptStatus status,
      @Param("from") Instant from,
      @Param("toExclusive") Instant toExclusive);
}
