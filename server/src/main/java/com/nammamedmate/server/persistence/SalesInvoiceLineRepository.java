package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.SalesInvoiceLine;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SalesInvoiceLineRepository extends JpaRepository<SalesInvoiceLine, UUID> {

  List<SalesInvoiceLine> findAllBySalesInvoiceIdAndTenantIdAndBranchIdOrderBySortOrderAsc(
      UUID salesInvoiceId, UUID tenantId, UUID branchId);

  List<SalesInvoiceLine> findAllByTenantIdAndBranchIdAndSalesInvoiceIdIn(
      UUID tenantId, UUID branchId, Collection<UUID> salesInvoiceIds);

  void deleteBySalesInvoiceIdAndTenantIdAndBranchId(
      UUID salesInvoiceId, UUID tenantId, UUID branchId);
}
