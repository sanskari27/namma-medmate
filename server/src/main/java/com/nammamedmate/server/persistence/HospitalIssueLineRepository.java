package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.HospitalIssueLine;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HospitalIssueLineRepository extends JpaRepository<HospitalIssueLine, UUID> {

  List<HospitalIssueLine> findAllByIssueIdAndTenantIdAndBranchIdOrderBySortOrderAsc(
      UUID issueId, UUID tenantId, UUID branchId);
}
