package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.CustomerFamilyMember;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CustomerFamilyMemberRepository extends JpaRepository<CustomerFamilyMember, UUID> {

  Optional<CustomerFamilyMember> findByTenantIdAndCustomerId(UUID tenantId, UUID customerId);

  List<CustomerFamilyMember> findAllByTenantIdAndFamilyIdOrderByCreatedAtAsc(
      UUID tenantId, UUID familyId);

  long countByTenantIdAndFamilyId(UUID tenantId, UUID familyId);

  void deleteByTenantIdAndFamilyIdAndCustomerId(UUID tenantId, UUID familyId, UUID customerId);

  boolean existsByTenantIdAndFamilyIdAndCustomerId(UUID tenantId, UUID familyId, UUID customerId);
}
