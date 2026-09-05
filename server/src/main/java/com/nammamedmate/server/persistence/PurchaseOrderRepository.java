package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.PurchaseOrder;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, UUID> {

  Optional<PurchaseOrder> findByTenantIdAndBranchIdAndIdempotencyKey(
      UUID tenantId, UUID branchId, String idempotencyKey);

  Optional<PurchaseOrder> findByIdAndTenantIdAndBranchId(UUID id, UUID tenantId, UUID branchId);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query(
      """
      select p from PurchaseOrder p
      where p.id = :id and p.tenantId = :tenantId and p.branchId = :branchId
      """)
  Optional<PurchaseOrder> lockByIdAndTenantIdAndBranchId(
      @Param("id") UUID id, @Param("tenantId") UUID tenantId, @Param("branchId") UUID branchId);

  List<PurchaseOrder> findByTenantIdAndBranchIdOrderByCreatedAtDesc(UUID tenantId, UUID branchId);

  List<PurchaseOrder> findByTenantIdAndBranchIdAndSupplierIdOrderByCreatedAtDesc(
      UUID tenantId, UUID branchId, UUID supplierId);

  long countByTenantIdAndBranchIdAndPoNumberStartingWith(
      UUID tenantId, UUID branchId, String poNumber);
}
