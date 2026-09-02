package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.UserAccessRole;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

public interface UserAccessRoleRepository extends JpaRepository<UserAccessRole, UUID> {

  List<UserAccessRole> findByUserId(UUID userId);

  @Query(
      """
      select a from UserAccessRole a
      where a.userId = :userId
        and a.tenantId = :tenantId
      """)
  List<UserAccessRole> findByUserIdAndTenantId(
      @Param("userId") UUID userId, @Param("tenantId") UUID tenantId);

  List<UserAccessRole> findByUserIdAndTenantIdIsNull(UUID userId);

  Optional<UserAccessRole> findByUserIdAndRoleId(UUID userId, UUID roleId);

  List<UserAccessRole> findByRoleId(UUID roleId);

  @Modifying
  @Transactional
  void deleteByRoleId(UUID roleId);

  @Modifying
  @Transactional
  void deleteByUserIdAndRoleId(UUID userId, UUID roleId);

  @Modifying
  @Transactional
  void deleteByUserIdAndTenantId(UUID userId, UUID tenantId);

  @Modifying
  @Transactional
  void deleteByUserIdAndTenantIdIsNull(UUID userId);
}
