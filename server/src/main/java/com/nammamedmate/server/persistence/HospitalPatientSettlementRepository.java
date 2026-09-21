package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.HospitalPatientSettlement;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HospitalPatientSettlementRepository
    extends JpaRepository<HospitalPatientSettlement, UUID> {

  Optional<HospitalPatientSettlement> findByTenantIdAndIdempotencyKey(
      UUID tenantId, String idempotencyKey);
}
