package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.SalesReturn;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SalesReturnRepository extends JpaRepository<SalesReturn, UUID> {

  Optional<SalesReturn> findByIdAndTenantIdAndBranchId(UUID id, UUID tenantId, UUID branchId);

  Optional<SalesReturn> findByTenantIdAndBranchIdAndIdempotencyKey(
      UUID tenantId, UUID branchId, String idempotencyKey);

  List<SalesReturn> findAllByTenantIdAndBranchIdOrderByCreatedAtDesc(UUID tenantId, UUID branchId);

  List<SalesReturn> findAllByTenantIdAndBranchIdAndSalesInvoiceIdOrderByCreatedAtAsc(
      UUID tenantId, UUID branchId, UUID salesInvoiceId);

  @Query(
      """
      select r from SalesReturn r
      where r.tenantId = :tenantId
        and r.branchId in :branchIds
        and r.createdAt >= :from
        and r.createdAt < :toExclusive
      order by r.createdAt asc
      """)
  List<SalesReturn> findAllInWindow(
      @Param("tenantId") UUID tenantId,
      @Param("branchIds") Collection<UUID> branchIds,
      @Param("from") Instant from,
      @Param("toExclusive") Instant toExclusive);
}
