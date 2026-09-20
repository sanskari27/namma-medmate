package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.HospitalWard;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HospitalWardRepository extends JpaRepository<HospitalWard, UUID> {

  List<HospitalWard> findAllByTenantIdAndBranchIdOrderByNameAsc(UUID tenantId, UUID branchId);

  Optional<HospitalWard> findByIdAndTenantIdAndBranchId(UUID id, UUID tenantId, UUID branchId);

  boolean existsByTenantIdAndBranchIdAndCodeIgnoreCase(UUID tenantId, UUID branchId, String code);

  boolean existsByTenantIdAndBranchIdAndCodeIgnoreCaseAndIdNot(
      UUID tenantId, UUID branchId, String code, UUID id);
}
