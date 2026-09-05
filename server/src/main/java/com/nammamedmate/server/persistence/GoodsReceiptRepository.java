package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.GoodsReceipt;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GoodsReceiptRepository extends JpaRepository<GoodsReceipt, UUID> {

  Optional<GoodsReceipt> findByTenantIdAndBranchIdAndIdempotencyKey(
      UUID tenantId, UUID branchId, String idempotencyKey);

  Optional<GoodsReceipt> findByTenantIdAndBranchIdAndReceiptReference(
      UUID tenantId, UUID branchId, String receiptReference);

  List<GoodsReceipt> findAllByPurchaseOrderIdAndTenantIdAndBranchIdOrderByCreatedAtAsc(
      UUID purchaseOrderId, UUID tenantId, UUID branchId);

  long countByTenantIdAndBranchIdAndReceiptNumberStartingWith(
      UUID tenantId, UUID branchId, String receiptNumber);
}
