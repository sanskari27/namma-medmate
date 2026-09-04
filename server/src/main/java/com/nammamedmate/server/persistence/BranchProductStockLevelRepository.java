package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.BranchProductStockLevel;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BranchProductStockLevelRepository
    extends JpaRepository<BranchProductStockLevel, UUID> {

  Optional<BranchProductStockLevel> findByTenantIdAndBranchIdAndProductId(
      UUID tenantId, UUID branchId, UUID productId);

  List<BranchProductStockLevel> findAllByTenantIdAndBranchId(UUID tenantId, UUID branchId);
}
