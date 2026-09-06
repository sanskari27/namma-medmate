package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.Product;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProductRepository extends JpaRepository<Product, UUID> {

  Optional<Product> findByIdAndTenantId(UUID id, UUID tenantId);

  Optional<Product> findByTenantIdAndSku(UUID tenantId, String sku);

  List<Product> findAllByTenantIdOrderByNameAsc(UUID tenantId);

  List<Product> findAllByTenantIdAndIdIn(UUID tenantId, Collection<UUID> ids);

  @Query(
      """
      select p from Product p
      where p.tenantId = :tenantId
        and (
          lower(p.name) like lower(concat('%', :q, '%'))
          or lower(p.sku) like lower(concat('%', :q, '%'))
          or (p.barcode is not null and lower(p.barcode) like lower(concat('%', :q, '%')))
        )
      order by p.name asc
      """)
  List<Product> searchByTenant(@Param("tenantId") UUID tenantId, @Param("q") String q);
}
