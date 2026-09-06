package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.CustomerTagAssignment;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CustomerTagAssignmentRepository
    extends JpaRepository<CustomerTagAssignment, CustomerTagAssignment.Pk> {

  List<CustomerTagAssignment> findAllByTenantIdAndCustomerId(UUID tenantId, UUID customerId);

  long countByTenantIdAndTagId(UUID tenantId, UUID tagId);

  void deleteAllByTenantIdAndCustomerId(UUID tenantId, UUID customerId);

  @Query(
      """
      select distinct a.customerId
      from CustomerTagAssignment a, Customer c
      where a.tenantId = :tenantId
        and a.tagId in :tagIds
        and c.id = a.customerId
        and c.tenantId = :tenantId
        and c.deletedAt is null
        and c.mergedIntoId is null
      """)
  List<UUID> findLiveCustomerIdsByTagIds(
      @Param("tenantId") UUID tenantId, @Param("tagIds") Collection<UUID> tagIds);
}
