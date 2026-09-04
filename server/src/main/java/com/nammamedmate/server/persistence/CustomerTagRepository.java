package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.CustomerTag;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CustomerTagRepository extends JpaRepository<CustomerTag, UUID> {

  List<CustomerTag> findAllByTenantIdOrderByNameAsc(UUID tenantId);

  @Query(
      """
      select t from CustomerTag t
      where t.tenantId = :tenantId and lower(t.name) = lower(:name)
      """)
  Optional<CustomerTag> findByTenantIdAndNameIgnoreCase(
      @Param("tenantId") UUID tenantId, @Param("name") String name);

  Optional<CustomerTag> findByIdAndTenantId(UUID id, UUID tenantId);

  List<CustomerTag> findAllByTenantIdAndIdIn(UUID tenantId, List<UUID> ids);
}
