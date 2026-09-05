package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.GoodsReceiptLine;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GoodsReceiptLineRepository extends JpaRepository<GoodsReceiptLine, UUID> {

  List<GoodsReceiptLine> findAllByGoodsReceiptIdAndTenantIdAndBranchIdOrderBySortOrderAsc(
      UUID goodsReceiptId, UUID tenantId, UUID branchId);

  List<GoodsReceiptLine> findAllByGoodsReceiptIdInAndTenantIdAndBranchIdOrderBySortOrderAsc(
      Collection<UUID> goodsReceiptIds, UUID tenantId, UUID branchId);

  List<GoodsReceiptLine> findAllByTenantIdAndBranchIdAndPurchaseOrderLineId(
      UUID tenantId, UUID branchId, UUID purchaseOrderLineId);
}
