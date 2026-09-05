package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.PurchaseReturn;
import com.nammamedmate.server.domain.PurchaseReturnOrigin;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PurchaseReturnRepository extends JpaRepository<PurchaseReturn, UUID> {

  Optional<PurchaseReturn> findByIdAndTenantIdAndBranchId(UUID id, UUID tenantId, UUID branchId);

  Optional<PurchaseReturn> findByTenantIdAndBranchIdAndIdempotencyKey(
      UUID tenantId, UUID branchId, String idempotencyKey);

  Optional<PurchaseReturn> findByTenantIdAndBranchIdAndGoodsReceiptIdAndOrigin(
      UUID tenantId, UUID branchId, UUID goodsReceiptId, PurchaseReturnOrigin origin);

  List<PurchaseReturn> findAllByTenantIdAndBranchIdOrderByCreatedAtDesc(
      UUID tenantId, UUID branchId);

  long countByTenantIdAndBranchIdAndDebitNoteNumberStartingWith(
      UUID tenantId, UUID branchId, String debitNoteNumberPrefix);
}
