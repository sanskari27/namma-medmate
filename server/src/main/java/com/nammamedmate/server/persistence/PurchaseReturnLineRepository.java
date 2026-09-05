package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.PurchaseReturnLine;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PurchaseReturnLineRepository extends JpaRepository<PurchaseReturnLine, UUID> {

  List<PurchaseReturnLine> findAllByPurchaseReturnIdAndTenantIdAndBranchIdOrderBySortOrderAsc(
      UUID purchaseReturnId, UUID tenantId, UUID branchId);

  List<PurchaseReturnLine> findAllByPurchaseReturnIdInAndTenantIdAndBranchIdOrderBySortOrderAsc(
      Collection<UUID> purchaseReturnIds, UUID tenantId, UUID branchId);

  List<PurchaseReturnLine> findAllByTenantIdAndBranchIdAndGoodsReceiptLineId(
      UUID tenantId, UUID branchId, UUID goodsReceiptLineId);
}
