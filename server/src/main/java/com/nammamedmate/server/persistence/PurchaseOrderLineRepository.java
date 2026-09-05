package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.PurchaseOrderLine;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PurchaseOrderLineRepository extends JpaRepository<PurchaseOrderLine, UUID> {

  List<PurchaseOrderLine> findAllByPurchaseOrderIdAndTenantIdAndBranchIdOrderBySortOrderAsc(
      UUID purchaseOrderId, UUID tenantId, UUID branchId);

  void deleteByPurchaseOrderIdAndTenantIdAndBranchId(
      UUID purchaseOrderId, UUID tenantId, UUID branchId);

  @Query(
      """
      select l from PurchaseOrderLine l
      where l.tenantId = :tenantId
        and l.branchId = :branchId
        and l.productId = :productId
        and l.purchaseOrderId in (
          select p.id from PurchaseOrder p
          where p.tenantId = :tenantId
            and p.branchId = :branchId
            and p.supplierId = :supplierId
            and p.status <> com.nammamedmate.server.domain.PurchaseOrderStatus.CANCELLED
        )
      order by l.createdAt desc
      """)
  List<PurchaseOrderLine> findRecentRatesForProductAndSupplier(
      @Param("tenantId") UUID tenantId,
      @Param("branchId") UUID branchId,
      @Param("productId") UUID productId,
      @Param("supplierId") UUID supplierId);
}
