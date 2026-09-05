package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.PurchaseOrderLine;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PurchaseOrderLineRepository extends JpaRepository<PurchaseOrderLine, UUID> {

  List<PurchaseOrderLine> findAllByPurchaseOrderIdAndTenantIdAndBranchIdOrderBySortOrderAsc(
      UUID purchaseOrderId, UUID tenantId, UUID branchId);

  void deleteByPurchaseOrderIdAndTenantIdAndBranchId(
      UUID purchaseOrderId, UUID tenantId, UUID branchId);
}
