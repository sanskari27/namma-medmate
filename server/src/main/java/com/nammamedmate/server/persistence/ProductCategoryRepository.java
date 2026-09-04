package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.ProductCategory;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProductCategoryRepository extends JpaRepository<ProductCategory, UUID> {

  Optional<ProductCategory> findByIdAndTenantId(UUID id, UUID tenantId);

  List<ProductCategory> findAllByTenantIdOrderByNameAsc(UUID tenantId);

  @Query(
      """
      select c from ProductCategory c
      where c.tenantId = :tenantId
        and lower(c.name) = lower(:name)
      """)
  Optional<ProductCategory> findByTenantIdAndNameIgnoreCase(
      @Param("tenantId") UUID tenantId, @Param("name") String name);
}
