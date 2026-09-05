package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.SupplierLedgerEntry;
import com.nammamedmate.server.domain.SupplierLedgerType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SupplierLedgerEntryRepository extends JpaRepository<SupplierLedgerEntry, UUID> {

  List<SupplierLedgerEntry> findAllByTenantIdAndBranchIdAndSupplierIdOrderByOccurredAtDesc(
      UUID tenantId, UUID branchId, UUID supplierId);

  Optional<SupplierLedgerEntry> findByTenantIdAndBranchIdAndIdempotencyKey(
      UUID tenantId, UUID branchId, String idempotencyKey);

  Optional<SupplierLedgerEntry> findByTenantIdAndBranchIdAndPaymentReferenceAndType(
      UUID tenantId, UUID branchId, String paymentReference, SupplierLedgerType type);

  List<SupplierLedgerEntry> findAllByTenantIdAndBranchIdAndSupplierIdInOrderByOccurredAtAsc(
      UUID tenantId, UUID branchId, List<UUID> supplierIds);
}
