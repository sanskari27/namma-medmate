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
import org.springframework.data.jpa.repository.Modifying;
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
  @Query(
      """
      select i from SalesInvoice i
      where i.discountApprovalRequestId = :requestId and i.tenantId = :tenantId
      """)
  Optional<SalesInvoice> lockByDiscountApprovalRequestIdAndTenantId(
      @Param("requestId") UUID requestId, @Param("tenantId") UUID tenantId);

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

  @Query(
      """
      select i.customerId, count(i), coalesce(sum(i.totalPaise), 0), max(i.completedAt),
             coalesce(sum(i.loyaltyEarnedPoints), 0)
      from SalesInvoice i
      where i.tenantId = :tenantId
        and i.status = :status
        and i.customerId is not null
      group by i.customerId
      """)
  List<Object[]> aggregateCompletedByCustomer(
      @Param("tenantId") UUID tenantId, @Param("status") SalesInvoiceStatus status);

  @Query(
      """
      select count(i), coalesce(sum(i.totalPaise), 0), max(i.completedAt),
             coalesce(sum(i.loyaltyEarnedPoints), 0)
      from SalesInvoice i
      where i.tenantId = :tenantId
        and i.status = :status
        and i.customerId is null
      """)
  List<Object[]> aggregateWalkInCompleted(
      @Param("tenantId") UUID tenantId, @Param("status") SalesInvoiceStatus status);

  @Query(
      """
      select i.customerId, coalesce(sum(l.quantity), 0)
      from SalesInvoiceLine l, SalesInvoice i
      where l.salesInvoiceId = i.id
        and i.tenantId = :tenantId
        and i.status = :status
        and i.customerId is not null
      group by i.customerId
      """)
  List<Object[]> sumUnitsByCustomer(
      @Param("tenantId") UUID tenantId, @Param("status") SalesInvoiceStatus status);

  @Query(
      """
      select coalesce(sum(l.quantity), 0)
      from SalesInvoiceLine l, SalesInvoice i
      where l.salesInvoiceId = i.id
        and i.tenantId = :tenantId
        and i.status = :status
        and i.customerId is null
      """)
  Object sumWalkInUnits(
      @Param("tenantId") UUID tenantId, @Param("status") SalesInvoiceStatus status);

  List<SalesInvoice> findTop40ByTenantIdAndStatusAndCustomerIdIsNullOrderByCompletedAtDesc(
      UUID tenantId, SalesInvoiceStatus status);

  List<SalesInvoice> findTop40ByTenantIdAndStatusAndCustomerIdOrderByCompletedAtDesc(
      UUID tenantId, SalesInvoiceStatus status, UUID customerId);

  long countByTenantIdAndCustomerId(UUID tenantId, UUID customerId);

  @Modifying(clearAutomatically = true)
  @Query(
      """
      update SalesInvoice i
      set i.customerId = :survivorId
      where i.customerId = :duplicateId
        and i.tenantId = :tenantId
      """)
  int repointCustomerId(
      @Param("survivorId") UUID survivorId,
      @Param("duplicateId") UUID duplicateId,
      @Param("tenantId") UUID tenantId);
}
