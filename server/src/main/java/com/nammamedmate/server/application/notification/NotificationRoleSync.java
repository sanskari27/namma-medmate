package com.nammamedmate.server.application.notification;

import com.nammamedmate.server.domain.AccessRole;
import com.nammamedmate.server.domain.NotificationRoleAssignment;
import com.nammamedmate.server.domain.RoutingRole;
import com.nammamedmate.server.domain.UserAccessRole;
import com.nammamedmate.server.domain.UserBranch;
import com.nammamedmate.server.persistence.AccessRoleRepository;
import com.nammamedmate.server.persistence.NotificationRoleAssignmentRepository;
import com.nammamedmate.server.persistence.UserAccessRoleRepository;
import com.nammamedmate.server.persistence.UserBranchRepository;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class NotificationRoleSync {

  private final NotificationRoleAssignmentRepository assignmentRepository;
  private final UserAccessRoleRepository userAccessRoleRepository;
  private final AccessRoleRepository accessRoleRepository;
  private final UserBranchRepository userBranchRepository;
  private final Clock clock;

  public NotificationRoleSync(
      NotificationRoleAssignmentRepository assignmentRepository,
      UserAccessRoleRepository userAccessRoleRepository,
      AccessRoleRepository accessRoleRepository,
      UserBranchRepository userBranchRepository,
      Clock clock) {
    this.assignmentRepository = assignmentRepository;
    this.userAccessRoleRepository = userAccessRoleRepository;
    this.accessRoleRepository = accessRoleRepository;
    this.userBranchRepository = userBranchRepository;
    this.clock = clock;
  }

  public void sync(UUID userId, UUID tenantId) {
    if (userId == null || tenantId == null) {
      return;
    }
    assignmentRepository.deleteByUserIdAndTenantId(userId, tenantId);
    assignmentRepository.flush();
    Instant now = Instant.now(clock);
    List<UUID> branchIds =
        userBranchRepository
            .findAllByTenantIdAndUserIdOrderByCreatedAtAsc(tenantId, userId)
            .stream()
            .map(UserBranch::getBranchId)
            .toList();
    for (UserAccessRole assigned :
        userAccessRoleRepository.findByUserIdAndTenantId(userId, tenantId)) {
      AccessRole role = accessRoleRepository.findById(assigned.getRoleId()).orElse(null);
      RoutingRole routing = routingRole(role);
      if (routing == null) {
        continue;
      }
      if (routing == RoutingRole.ACCOUNTANT || routing == RoutingRole.APPROVER) {
        save(userId, tenantId, null, routing, now);
        continue;
      }
      for (UUID branchId : branchIds) {
        save(userId, tenantId, branchId, routing, now);
      }
    }
  }

  private void save(
      UUID userId, UUID tenantId, UUID branchId, RoutingRole routingRole, Instant now) {
    NotificationRoleAssignment row = new NotificationRoleAssignment();
    row.setId(UUID.randomUUID());
    row.setUserId(userId);
    row.setTenantId(tenantId);
    row.setBranchId(branchId);
    row.setRoutingRole(routingRole);
    row.setCreatedAt(now);
    assignmentRepository.save(row);
  }

  private static RoutingRole routingRole(AccessRole role) {
    if (role == null || role.getCode() == null) {
      return null;
    }
    return switch (role.getCode()) {
      case "inventory" -> RoutingRole.INVENTORY;
      case "pharmacist" -> RoutingRole.PHARMACIST;
      case "accountant" -> RoutingRole.ACCOUNTANT;
      default -> null;
    };
  }
}
