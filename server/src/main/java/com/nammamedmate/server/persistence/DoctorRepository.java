package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.Doctor;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DoctorRepository extends JpaRepository<Doctor, UUID> {

  Optional<Doctor> findByIdAndTenantIdAndDeletedAtIsNull(UUID id, UUID tenantId);

  List<Doctor> findAllByTenantIdAndDeletedAtIsNullOrderByNameAsc(UUID tenantId);

  Optional<Doctor> findByTenantIdAndRegistrationNumberAndDeletedAtIsNull(
      UUID tenantId, String registrationNumber);
}
