package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.AccessRole;
import com.nammamedmate.server.domain.AccessRoleKind;
import com.nammamedmate.server.domain.AccessScope;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AccessRoleRepository extends JpaRepository<AccessRole, UUID> {

  List<AccessRole> findByKindAndDeletedAtIsNull(AccessRoleKind kind);

  List<AccessRole> findByKind(AccessRoleKind kind);

  List<AccessRole> findByScopeAndKindAndDeletedAtIsNull(AccessScope scope, AccessRoleKind kind);

  List<AccessRole> findByTenantIdAndKindAndDeletedAtIsNull(UUID tenantId, AccessRoleKind kind);

  List<AccessRole> findByTenantIdIsNullAndScopeAndKindAndDeletedAtIsNull(
      AccessScope scope, AccessRoleKind kind);

  Optional<AccessRole> findByCodeAndDeletedAtIsNull(String code);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select r from AccessRole r where r.id = :id")
  Optional<AccessRole> lockById(@Param("id") UUID id);

  @Query(
      """
      select r from AccessRole r
      where r.tenantId = :tenantId
        and r.kind = com.nammamedmate.server.domain.AccessRoleKind.CUSTOM
        and r.deletedAt is null
        and lower(r.name) = lower(:name)
      """)
  Optional<AccessRole> findActiveCustomByTenantIdAndNameIgnoreCase(
      @Param("tenantId") UUID tenantId, @Param("name") String name);

  @Query(
      """
      select r from AccessRole r
      where r.tenantId is null
        and r.scope = com.nammamedmate.server.domain.AccessScope.PLATFORM
        and r.kind = com.nammamedmate.server.domain.AccessRoleKind.CUSTOM
        and r.deletedAt is null
        and lower(r.name) = lower(:name)
      """)
  Optional<AccessRole> findActivePlatformCustomByNameIgnoreCase(@Param("name") String name);
}
