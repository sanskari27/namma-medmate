package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.CustomerRefillSchedule;
import jakarta.persistence.LockModeType;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CustomerRefillScheduleRepository
    extends JpaRepository<CustomerRefillSchedule, UUID> {

  List<CustomerRefillSchedule> findAllByTenantIdAndCustomerIdOrderByNextDueOnAscMedicineNameAsc(
      UUID tenantId, UUID customerId);

  @Query(
      """
      select r from CustomerRefillSchedule r
      where r.tenantId = :tenantId
        and lower(r.medicineName) = lower(:medicineName)
        and r.customerId = :customerId
      """)
  Optional<CustomerRefillSchedule> findByTenantIdAndCustomerIdAndMedicineNameIgnoreCase(
      @Param("tenantId") UUID tenantId,
      @Param("customerId") UUID customerId,
      @Param("medicineName") String medicineName);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query(
      """
      select r from CustomerRefillSchedule r
      where r.tenantId = :tenantId and r.id = :id and r.customerId = :customerId
      """)
  Optional<CustomerRefillSchedule> lockByTenantIdAndCustomerIdAndId(
      @Param("tenantId") UUID tenantId, @Param("customerId") UUID customerId, @Param("id") UUID id);

  List<CustomerRefillSchedule> findAllByTenantIdAndNextDueOnLessThanEqualOrderByNextDueOnAsc(
      UUID tenantId, LocalDate asOf);
}
