package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.SupplierLedgerEntry;
import com.nammamedmate.server.domain.SupplierLedgerType;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SupplierLedgerEntryRepository extends JpaRepository<SupplierLedgerEntry, UUID> {

  List<SupplierLedgerEntry> findAllByTenantIdAndBranchIdAndSupplierIdOrderByOccurredAtDesc(
      UUID tenantId, UUID branchId, UUID supplierId);

  Optional<SupplierLedgerEntry> findByTenantIdAndBranchIdAndIdempotencyKey(
      UUID tenantId, UUID branchId, String idempotencyKey);

  Optional<SupplierLedgerEntry> findByTenantIdAndBranchIdAndPaymentReferenceAndType(
      UUID tenantId, UUID branchId, String paymentReference, SupplierLedgerType type);

  List<SupplierLedgerEntry> findAllByTenantIdAndBranchIdAndSupplierIdInOrderByOccurredAtAsc(
      UUID tenantId, UUID branchId, List<UUID> supplierIds);

  @Query(
      """
      select e from SupplierLedgerEntry e
      where e.tenantId = :tenantId
        and e.branchId in :branchIds
        and e.occurredAt <= :cutoff
      order by e.occurredAt asc, e.id asc
      """)
  List<SupplierLedgerEntry> findAllByTenantIdAndBranchIdInAndOccurredAtOnOrBefore(
      @Param("tenantId") UUID tenantId,
      @Param("branchIds") Collection<UUID> branchIds,
      @Param("cutoff") Instant cutoff);

  @Query(
      """
      select e from SupplierLedgerEntry e
      where e.tenantId = :tenantId
        and e.branchId in :branchIds
        and e.occurredAt >= :from
        and e.occurredAt < :toExclusive
      order by e.occurredAt asc, e.id asc
      """)
  List<SupplierLedgerEntry> findAllInWindow(
      @Param("tenantId") UUID tenantId,
      @Param("branchIds") Collection<UUID> branchIds,
      @Param("from") Instant from,
      @Param("toExclusive") Instant toExclusive);
}
