package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.HospitalReturn;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HospitalReturnRepository extends JpaRepository<HospitalReturn, UUID> {

  Optional<HospitalReturn> findByTenantIdAndIdempotencyKey(UUID tenantId, String idempotencyKey);
}
