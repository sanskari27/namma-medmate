package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.CustomerTagAssignment;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CustomerTagAssignmentRepository
    extends JpaRepository<CustomerTagAssignment, CustomerTagAssignment.Pk> {

  List<CustomerTagAssignment> findAllByTenantIdAndCustomerId(UUID tenantId, UUID customerId);

  long countByTenantIdAndTagId(UUID tenantId, UUID tagId);

  void deleteAllByTenantIdAndCustomerId(UUID tenantId, UUID customerId);
}
