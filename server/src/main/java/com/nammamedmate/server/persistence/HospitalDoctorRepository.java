package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.HospitalDoctor;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HospitalDoctorRepository extends JpaRepository<HospitalDoctor, UUID> {

  List<HospitalDoctor> findAllByTenantIdOrderByCreatedAtAsc(UUID tenantId);

  Optional<HospitalDoctor> findByDoctorIdAndTenantId(UUID doctorId, UUID tenantId);

  Optional<HospitalDoctor> findByIdAndTenantId(UUID id, UUID tenantId);

  boolean existsByTenantIdAndDoctorId(UUID tenantId, UUID doctorId);
}
