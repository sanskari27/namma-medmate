package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AppUserRepository extends JpaRepository<AppUser, UUID> {

  Optional<AppUser> findByEmailAndDeletedAtIsNull(String email);

  @Query(
      """
      select u from AppUser u
      where lower(u.email) = :normalizedEmail
        and u.deletedAt is null
      """)
  Optional<AppUser> findByNormalizedEmailAndDeletedAtIsNull(
      @Param("normalizedEmail") String normalizedEmail);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select u from AppUser u where u.id = :id")
  Optional<AppUser> lockById(@Param("id") UUID id);

  @Query(
      """
      select u from AppUser u
      where u.tenantId = :tenantId
        and u.role = :role
        and u.status = com.nammamedmate.server.domain.UserAccountStatus.ACTIVE
        and u.active = true
        and u.deletedAt is null
      """)
  List<AppUser> findActiveByTenantIdAndRole(
      @Param("tenantId") UUID tenantId, @Param("role") AppUserRole role);

  @Query(
      """
      select u from AppUser u
      where u.tenantId is null
        and u.role = com.nammamedmate.server.domain.AppUserRole.admin_super
        and u.status = com.nammamedmate.server.domain.UserAccountStatus.ACTIVE
        and u.active = true
        and u.deletedAt is null
      """)
  List<AppUser> findActiveMasters();
}
