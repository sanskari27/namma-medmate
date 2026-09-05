package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.SalesInvoicePayment;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SalesInvoicePaymentRepository extends JpaRepository<SalesInvoicePayment, UUID> {

  List<SalesInvoicePayment> findAllBySalesInvoiceIdAndTenantIdAndBranchIdOrderBySortOrderAsc(
      UUID salesInvoiceId, UUID tenantId, UUID branchId);
}
