package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.Manufacturer;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ManufacturerRepository extends JpaRepository<Manufacturer, UUID> {

  Optional<Manufacturer> findByIdAndTenantId(UUID id, UUID tenantId);

  List<Manufacturer> findAllByTenantIdOrderByNameAsc(UUID tenantId);

  @Query(
      """
      select m from Manufacturer m
      where m.tenantId = :tenantId
        and lower(m.name) = lower(:name)
      """)
  Optional<Manufacturer> findByTenantIdAndNameIgnoreCase(
      @Param("tenantId") UUID tenantId, @Param("name") String name);
}
