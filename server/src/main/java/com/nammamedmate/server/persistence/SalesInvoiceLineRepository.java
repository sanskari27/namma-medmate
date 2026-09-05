package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.SalesInvoiceLine;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SalesInvoiceLineRepository extends JpaRepository<SalesInvoiceLine, UUID> {

  List<SalesInvoiceLine> findAllBySalesInvoiceIdAndTenantIdAndBranchIdOrderBySortOrderAsc(
      UUID salesInvoiceId, UUID tenantId, UUID branchId);

  void deleteBySalesInvoiceIdAndTenantIdAndBranchId(
      UUID salesInvoiceId, UUID tenantId, UUID branchId);
}
