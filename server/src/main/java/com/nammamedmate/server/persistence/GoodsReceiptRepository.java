package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.GoodsReceipt;
import jakarta.persistence.LockModeType;
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
}
