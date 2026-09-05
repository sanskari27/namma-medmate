package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.ControlledSaleKind;
import com.nammamedmate.server.domain.ControlledSaleRegister;
import com.nammamedmate.server.domain.ScheduleClassification;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ControlledSaleRegisterRepository
    extends JpaRepository<ControlledSaleRegister, UUID> {

  Optional<ControlledSaleRegister> findByTenantIdAndSalesInvoiceLineIdAndKind(
      UUID tenantId, UUID salesInvoiceLineId, ControlledSaleKind kind);

  Optional<ControlledSaleRegister> findByTenantIdAndSalesReturnLineIdAndKind(
      UUID tenantId, UUID salesReturnLineId, ControlledSaleKind kind);

  @Query(
      """
      select r from ControlledSaleRegister r
      where r.tenantId = :tenantId
        and r.branchId = :branchId
        and (:productId is null or r.productId = :productId)
        and (:patientId is null or r.patientId = :patientId)
        and (:pharmacistUserId is null or r.pharmacistUserId = :pharmacistUserId)
        and (:schedule is null or r.scheduleClassification = :schedule)
        and r.occurredAt >= :fromTime
        and r.occurredAt <= :toTime
      order by r.occurredAt desc, r.id desc
      """)
  List<ControlledSaleRegister> findFiltered(
      @Param("tenantId") UUID tenantId,
      @Param("branchId") UUID branchId,
      @Param("productId") UUID productId,
      @Param("patientId") UUID patientId,
      @Param("pharmacistUserId") UUID pharmacistUserId,
      @Param("schedule") ScheduleClassification schedule,
      @Param("fromTime") Instant fromTime,
      @Param("toTime") Instant toTime);

  @Query(
      """
      select r from ControlledSaleRegister r
      where r.tenantId = :tenantId
        and r.branchId = :branchId
        and (:productId is null or r.productId = :productId)
        and (:patientId is null or r.patientId = :patientId)
        and (:pharmacistUserId is null or r.pharmacistUserId = :pharmacistUserId)
        and (:schedule is null or r.scheduleClassification = :schedule)
        and r.occurredAt >= :fromTime
        and r.occurredAt <= :toTime
      order by r.occurredAt asc, r.id asc
      """)
  List<ControlledSaleRegister> findFilteredAscending(
      @Param("tenantId") UUID tenantId,
      @Param("branchId") UUID branchId,
      @Param("productId") UUID productId,
      @Param("patientId") UUID patientId,
      @Param("pharmacistUserId") UUID pharmacistUserId,
      @Param("schedule") ScheduleClassification schedule,
      @Param("fromTime") Instant fromTime,
      @Param("toTime") Instant toTime);
}
