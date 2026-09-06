package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.SalesInvoice;
import com.nammamedmate.server.domain.SalesInvoiceStatus;
import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SalesInvoiceRepository extends JpaRepository<SalesInvoice, UUID> {

  Optional<SalesInvoice> findByTenantIdAndBranchIdAndIdempotencyKey(
      UUID tenantId, UUID branchId, String idempotencyKey);

  Optional<SalesInvoice> findByIdAndTenantIdAndBranchId(UUID id, UUID tenantId, UUID branchId);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query(
      """
      select i from SalesInvoice i
      where i.id = :id and i.tenantId = :tenantId and i.branchId = :branchId
      """)
  Optional<SalesInvoice> lockByIdAndTenantIdAndBranchId(
      @Param("id") UUID id, @Param("tenantId") UUID tenantId, @Param("branchId") UUID branchId);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select i from SalesInvoice i where i.discountApprovalRequestId = :requestId")
  Optional<SalesInvoice> lockByDiscountApprovalRequestId(@Param("requestId") UUID requestId);

  List<SalesInvoice> findByTenantIdAndBranchIdOrderByCreatedAtDesc(UUID tenantId, UUID branchId);

  List<SalesInvoice> findByTenantIdAndBranchIdAndStatusOrderByCreatedAtDesc(
      UUID tenantId, UUID branchId, SalesInvoiceStatus status);

  List<SalesInvoice> findByTenantIdAndPrescriptionReferenceAndStatusOrderByCompletedAtAsc(
      UUID tenantId, String prescriptionReference, SalesInvoiceStatus status);

  List<SalesInvoice> findAllByTenantIdAndIdIn(UUID tenantId, Collection<UUID> ids);

  @Query(
      """
      select i from SalesInvoice i
      where i.tenantId = :tenantId
        and i.branchId in :branchIds
        and i.status = :status
        and i.completedAt >= :from
        and i.completedAt < :toExclusive
      order by i.completedAt asc, i.invoiceNumber asc
      """)
  List<SalesInvoice> findCompletedInWindow(
      @Param("tenantId") UUID tenantId,
      @Param("branchIds") Collection<UUID> branchIds,
      @Param("status") SalesInvoiceStatus status,
      @Param("from") Instant from,
      @Param("toExclusive") Instant toExclusive);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query(
      """
      select i from SalesInvoice i
      where i.tenantId = :tenantId
        and i.customerId = :customerId
        and i.status = :status
        and i.loyaltyPendingTaxablePaise > 0
      order by i.completedAt asc
      """)
  List<SalesInvoice> lockCompletedWithPendingLoyalty(
      @Param("tenantId") UUID tenantId,
      @Param("customerId") UUID customerId,
      @Param("status") SalesInvoiceStatus status);
}
