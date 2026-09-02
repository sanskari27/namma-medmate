package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.NotificationSource;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NotificationSourceRepository extends JpaRepository<NotificationSource, UUID> {

  @Query(
      """
      select s from NotificationSource s
      where s.id = :id
        and s.tenantId = :tenantId
        and s.branchId is null
      """)
  Optional<NotificationSource> findByIdAndTenantId(
      @Param("id") UUID id, @Param("tenantId") UUID tenantId);

  @Query(
      """
      select s from NotificationSource s
      where s.id = :id
        and s.tenantId = :tenantId
        and s.branchId = :branchId
      """)
  Optional<NotificationSource> findByIdAndTenantIdAndBranchId(
      @Param("id") UUID id, @Param("tenantId") UUID tenantId, @Param("branchId") UUID branchId);

  @Query(
      """
      select s from NotificationSource s
      where s.id = :id
        and s.tenantId is null
        and s.branchId is null
      """)
  Optional<NotificationSource> findPlatformById(@Param("id") UUID id);
}
