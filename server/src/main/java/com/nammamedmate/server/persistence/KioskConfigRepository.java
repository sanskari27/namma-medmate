package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.KioskConfig;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface KioskConfigRepository extends JpaRepository<KioskConfig, KioskConfig.KioskConfigId> {

  Optional<KioskConfig> findByTenantIdAndBranchId(UUID tenantId, UUID branchId);
}
