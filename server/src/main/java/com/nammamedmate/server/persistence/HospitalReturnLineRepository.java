package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.HospitalReturnLine;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HospitalReturnLineRepository extends JpaRepository<HospitalReturnLine, UUID> {

  List<HospitalReturnLine> findAllByTenantIdAndBranchIdAndIssueLineIdIn(
      UUID tenantId, UUID branchId, List<UUID> issueLineIds);

  List<HospitalReturnLine> findAllByReturnIdAndTenantIdAndBranchIdOrderBySortOrderAsc(
      UUID returnId, UUID tenantId, UUID branchId);
}
