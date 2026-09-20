package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.HospitalDepartment;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HospitalDepartmentRepository extends JpaRepository<HospitalDepartment, UUID> {

  List<HospitalDepartment> findAllByTenantIdOrderByNameAsc(UUID tenantId);

  Optional<HospitalDepartment> findByIdAndTenantId(UUID id, UUID tenantId);

  boolean existsByTenantIdAndNameIgnoreCase(UUID tenantId, String name);

  boolean existsByTenantIdAndNameIgnoreCaseAndIdNot(UUID tenantId, String name, UUID id);
}
