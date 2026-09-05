package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.PurchaseOrderReorderRun;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PurchaseOrderReorderRunRepository
    extends JpaRepository<PurchaseOrderReorderRun, UUID> {

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query(
      """
      select r from PurchaseOrderReorderRun r
      where r.tenantId = :tenantId
        and r.branchId = :branchId
        and r.idempotencyKey = :idempotencyKey
      """)
  Optional<PurchaseOrderReorderRun> lockByTenantIdAndBranchIdAndIdempotencyKey(
      @Param("tenantId") UUID tenantId,
      @Param("branchId") UUID branchId,
      @Param("idempotencyKey") String idempotencyKey);
}
