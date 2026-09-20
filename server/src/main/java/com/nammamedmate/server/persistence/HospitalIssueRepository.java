package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.HospitalIssue;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HospitalIssueRepository extends JpaRepository<HospitalIssue, UUID> {

  List<HospitalIssue> findAllByTenantIdAndBranchIdOrderByIssuedAtDesc(UUID tenantId, UUID branchId);

  Optional<HospitalIssue> findByIdAndTenantIdAndBranchId(UUID id, UUID tenantId, UUID branchId);

  Optional<HospitalIssue> findByTenantIdAndIdempotencyKey(UUID tenantId, String idempotencyKey);
}
