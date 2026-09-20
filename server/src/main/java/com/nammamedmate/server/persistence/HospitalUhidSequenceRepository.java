package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.HospitalUhidSequence;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface HospitalUhidSequenceRepository extends JpaRepository<HospitalUhidSequence, UUID> {

  Optional<HospitalUhidSequence> findByTenantId(UUID tenantId);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select s from HospitalUhidSequence s where s.tenantId = :tenantId")
  Optional<HospitalUhidSequence> lockByTenantId(@Param("tenantId") UUID tenantId);
}
