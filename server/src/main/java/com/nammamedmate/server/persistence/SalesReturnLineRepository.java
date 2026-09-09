package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.SalesReturnLine;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SalesReturnLineRepository extends JpaRepository<SalesReturnLine, UUID> {

  List<SalesReturnLine> findAllBySalesReturnIdAndTenantIdAndBranchIdOrderBySortOrderAsc(
      UUID salesReturnId, UUID tenantId, UUID branchId);

  List<SalesReturnLine> findAllByTenantIdAndBranchIdAndSalesReturnIdIn(
      UUID tenantId, UUID branchId, Collection<UUID> salesReturnIds);

  List<SalesReturnLine> findAllByTenantIdAndBranchIdAndSalesInvoiceLineId(
      UUID tenantId, UUID branchId, UUID salesInvoiceLineId);
}
