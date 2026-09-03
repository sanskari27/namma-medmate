package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.CustomerFamily;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CustomerFamilyRepository extends JpaRepository<CustomerFamily, UUID> {

  Optional<CustomerFamily> findByIdAndTenantId(UUID id, UUID tenantId);
}
