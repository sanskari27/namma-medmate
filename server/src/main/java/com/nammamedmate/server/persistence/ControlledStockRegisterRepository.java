package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.ControlledStockRegister;
import com.nammamedmate.server.domain.ScheduleClassification;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ControlledStockRegisterRepository
    extends JpaRepository<ControlledStockRegister, UUID> {

  Optional<ControlledStockRegister> findByTenantIdAndStockMovementId(
      UUID tenantId, UUID stockMovementId);

  @Query(
      """
      select r from ControlledStockRegister r
      where r.tenantId = :tenantId
        and r.branchId = :branchId
        and (:productId is null or r.productId = :productId)
        and (:schedule is null or r.scheduleClassification = :schedule)
        and r.occurredAt >= :fromTime
        and r.occurredAt <= :toTime
      order by r.occurredAt desc
      """)
  List<ControlledStockRegister> findFiltered(
      @Param("tenantId") UUID tenantId,
      @Param("branchId") UUID branchId,
      @Param("productId") UUID productId,
      @Param("schedule") ScheduleClassification schedule,
      @Param("fromTime") Instant fromTime,
      @Param("toTime") Instant toTime);

  @Query(
      """
      select r from ControlledStockRegister r
      where r.tenantId = :tenantId
        and r.branchId = :branchId
        and (:productId is null or r.productId = :productId)
        and (:schedule is null or r.scheduleClassification = :schedule)
        and r.occurredAt >= :fromTime
        and r.occurredAt <= :toTime
      order by r.occurredAt asc, r.id asc
      """)
  List<ControlledStockRegister> findFilteredAscending(
      @Param("tenantId") UUID tenantId,
      @Param("branchId") UUID branchId,
      @Param("productId") UUID productId,
      @Param("schedule") ScheduleClassification schedule,
      @Param("fromTime") Instant fromTime,
      @Param("toTime") Instant toTime);

  List<ControlledStockRegister> findAllByTenantIdAndBranchIdOrderByOccurredAtDesc(
      UUID tenantId, UUID branchId);
}
