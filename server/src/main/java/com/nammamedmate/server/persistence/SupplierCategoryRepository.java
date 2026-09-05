package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.SupplierCategory;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SupplierCategoryRepository extends JpaRepository<SupplierCategory, UUID> {

  List<SupplierCategory> findAllBySupplierIdAndTenantId(UUID supplierId, UUID tenantId);

  void deleteBySupplierIdAndTenantId(UUID supplierId, UUID tenantId);
}
