package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.CustomerHistoryFact;
import com.nammamedmate.server.domain.CustomerHistoryFactType;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CustomerHistoryFactRepository extends JpaRepository<CustomerHistoryFact, UUID> {

  List<CustomerHistoryFact> findAllByTenantIdAndCustomerIdOrderByOccurredAtDesc(
      UUID tenantId, UUID customerId);

  List<CustomerHistoryFact> findAllByTenantIdAndCustomerIdInOrderByOccurredAtDesc(
      UUID tenantId, Collection<UUID> customerIds);

  List<CustomerHistoryFact> findAllByTenantIdAndCustomerIdInAndTypeOrderByOccurredAtDesc(
      UUID tenantId, Collection<UUID> customerIds, CustomerHistoryFactType type);

  @Query(
      """
      select f.doctorId as doctorId, count(f) as referralCount
      from CustomerHistoryFact f
      where f.tenantId = :tenantId
        and f.doctorId is not null
      group by f.doctorId
      order by count(f) desc, f.doctorId asc
      """)
  List<DoctorReferralCount> countReferralsByDoctor(@Param("tenantId") UUID tenantId);

  interface DoctorReferralCount {
    UUID getDoctorId();

    long getReferralCount();
  }
}
