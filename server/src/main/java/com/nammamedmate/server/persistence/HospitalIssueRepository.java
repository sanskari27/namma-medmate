package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.HospitalIssue;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface HospitalIssueRepository extends JpaRepository<HospitalIssue, UUID> {

  List<HospitalIssue> findAllByTenantIdAndBranchIdOrderByIssuedAtDesc(UUID tenantId, UUID branchId);

  Optional<HospitalIssue> findByIdAndTenantIdAndBranchId(UUID id, UUID tenantId, UUID branchId);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query(
      """
      select i from HospitalIssue i
      where i.id = :id
        and i.tenantId = :tenantId
        and i.branchId = :branchId
      """)
  Optional<HospitalIssue> lockByIdAndTenantIdAndBranchId(
      @Param("id") UUID id, @Param("tenantId") UUID tenantId, @Param("branchId") UUID branchId);

  Optional<HospitalIssue> findByTenantIdAndIdempotencyKey(UUID tenantId, String idempotencyKey);

  List<HospitalIssue> findAllByIdInAndTenantId(List<UUID> ids, UUID tenantId);
}
