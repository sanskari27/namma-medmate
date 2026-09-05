package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.PurchaseOrderVersion;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PurchaseOrderVersionRepository extends JpaRepository<PurchaseOrderVersion, UUID> {

  List<PurchaseOrderVersion> findAllByPurchaseOrderIdOrderByVersionAsc(UUID purchaseOrderId);

  List<PurchaseOrderVersion> findAllByPurchaseOrderIdAndTenantIdAndBranchIdOrderByVersionAsc(
      UUID purchaseOrderId, UUID tenantId, UUID branchId);
}
