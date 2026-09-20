package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.HospitalIndentSequence;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface HospitalIndentSequenceRepository
    extends JpaRepository<HospitalIndentSequence, UUID> {

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query(
      """
      select s from HospitalIndentSequence s
      where s.tenantId = :tenantId
        and s.branchId = :branchId
      """)
  Optional<HospitalIndentSequence> lockByTenantIdAndBranchId(
      @Param("tenantId") UUID tenantId, @Param("branchId") UUID branchId);
}
