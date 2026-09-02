package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.NotificationRoleAssignment;
import com.nammamedmate.server.domain.RoutingRole;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NotificationRoleAssignmentRepository
    extends JpaRepository<NotificationRoleAssignment, UUID> {

  @Query(
      """
      select u from AppUser u
      where u.id in (
        select a.userId from NotificationRoleAssignment a
        where a.tenantId = :tenantId
          and a.branchId = :branchId
          and a.routingRole = :role
      )
        and u.tenantId = :tenantId
        and u.status = com.nammamedmate.server.domain.UserAccountStatus.ACTIVE
        and u.active = true
        and u.deletedAt is null
      """)
  List<AppUser> findActiveUsersAtBranch(
      @Param("tenantId") UUID tenantId,
      @Param("branchId") UUID branchId,
      @Param("role") RoutingRole role);

  @Query(
      """
      select distinct u from AppUser u
      where u.id in (
        select a.userId from NotificationRoleAssignment a
        where a.tenantId = :tenantId
          and a.routingRole = :role
      )
        and u.tenantId = :tenantId
        and u.status = com.nammamedmate.server.domain.UserAccountStatus.ACTIVE
        and u.active = true
        and u.deletedAt is null
      """)
  List<AppUser> findActiveUsersInTenant(
      @Param("tenantId") UUID tenantId, @Param("role") RoutingRole role);
}
