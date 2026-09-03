package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.Location;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface LocationRepository extends JpaRepository<Location, UUID> {

  Optional<Location> findByIdAndTenantIdAndDeletedAtIsNull(UUID id, UUID tenantId);

  List<Location> findAllByTenantIdAndDeletedAtIsNullOrderByBranchCodeAsc(UUID tenantId);

  long countByTenantIdAndDeletedAtIsNull(UUID tenantId);

  boolean existsByTenantIdAndDeletedAtIsNullAndDefaultBranchTrue(UUID tenantId);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query(
      "select l from Location l where l.id = :id and l.tenantId = :tenantId and l.deletedAt is null")
  Optional<Location> lockByIdAndTenantId(@Param("id") UUID id, @Param("tenantId") UUID tenantId);

  @Query(
      "select l from Location l where l.tenantId = :tenantId and l.defaultBranch = true and l.deletedAt is null")
  Optional<Location> findDefaultByTenantId(@Param("tenantId") UUID tenantId);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query(
      "select l from Location l where l.tenantId = :tenantId and l.defaultBranch = true and l.deletedAt is null")
  Optional<Location> lockDefaultByTenantId(@Param("tenantId") UUID tenantId);
}
