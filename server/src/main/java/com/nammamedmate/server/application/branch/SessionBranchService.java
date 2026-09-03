package com.nammamedmate.server.application.branch;

import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.BranchStatus;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.domain.UserSession;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.UserSessionRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SessionBranchService {

  private final AppUserRepository appUserRepository;
  private final UserSessionRepository userSessionRepository;
  private final LocationRepository locationRepository;
  private final BranchAssignmentService branchAssignmentService;

  public SessionBranchService(
      AppUserRepository appUserRepository,
      UserSessionRepository userSessionRepository,
      LocationRepository locationRepository,
      BranchAssignmentService branchAssignmentService) {
    this.appUserRepository = appUserRepository;
    this.userSessionRepository = userSessionRepository;
    this.locationRepository = locationRepository;
    this.branchAssignmentService = branchAssignmentService;
  }

  @Transactional
  public SessionBranchView switchBranch(AuthPrincipal principal, UUID branchId) {
    AppUser user = requireActiveUser(principal);
    UserSession session =
        userSessionRepository
            .lockActiveScopedSession(
                principal.sessionId(), principal.sessionUserId(), principal.sessionTenantId())
            .orElseThrow(
                () ->
                    new ApiException(
                        HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Authentication required"));

    if (branchId == null) {
      if (user.getRole() != AppUserRole.pharmacy_owner) {
        throw forbidden();
      }
      session.setActiveBranchId(null);
    } else {
      Location branch =
          locationRepository
              .findByIdAndTenantIdAndDeletedAtIsNull(branchId, user.getTenantId())
              .orElseThrow(SessionBranchService::forbidden);
      if (branch.getStatus() != BranchStatus.ACTIVE) {
        throw forbidden();
      }
      if (!branchAssignmentService.canAccessBranch(user, branchId)) {
        throw forbidden();
      }
      session.setActiveBranchId(branchId);
    }
    userSessionRepository.save(session);
    return currentView(user, session.getActiveBranchId());
  }

  @Transactional
  public void ensureDefaultActiveBranch(UUID sessionId, AppUser user) {
    if (user.getTenantId() == null || user.getRole() == AppUserRole.pharmacy_owner) {
      return;
    }
    UserSession session = userSessionRepository.findById(sessionId).orElse(null);
    if (session == null || session.getActiveBranchId() != null) {
      return;
    }
    List<AssignedBranchView> assigned = branchAssignmentService.visibleBranchesFor(user);
    if (!assigned.isEmpty()) {
      session.setActiveBranchId(assigned.get(0).id());
      userSessionRepository.save(session);
    }
  }

  @Transactional
  public SessionBranchView viewForSession(UUID sessionId, UUID userId) {
    AppUser user =
        appUserRepository
            .findById(userId)
            .filter(row -> row.getDeletedAt() == null)
            .orElseThrow(SessionBranchService::forbidden);
    UserSession session = userSessionRepository.findById(sessionId).orElse(null);
    UUID active = session == null ? null : session.getActiveBranchId();
    return sanitizeActive(user, session, active);
  }

  @Transactional
  public SessionBranchView currentFor(AuthPrincipal principal) {
    AppUser user = requireActiveUser(principal);
    UserSession session =
        userSessionRepository
            .findActiveScopedSession(
                principal.sessionId(), principal.sessionUserId(), principal.sessionTenantId())
            .orElse(null);
    UUID active = session == null ? principal.activeBranchId() : session.getActiveBranchId();
    return sanitizeActive(user, session, active);
  }

  private SessionBranchView sanitizeActive(AppUser user, UserSession session, UUID active) {
    if (active != null && !branchAssignmentService.canAccessBranch(user, active)) {
      if (session != null) {
        session.setActiveBranchId(null);
        userSessionRepository.save(session);
      }
      active = null;
    }
    return currentView(user, active);
  }

  private SessionBranchView currentView(AppUser user, UUID activeBranchId) {
    return new SessionBranchView(activeBranchId, branchAssignmentService.visibleBranchesFor(user));
  }

  private AppUser requireActiveUser(AuthPrincipal principal) {
    AppUser user =
        appUserRepository
            .findById(principal.userId())
            .filter(row -> row.getDeletedAt() == null)
            .filter(row -> row.getStatus() == UserAccountStatus.ACTIVE)
            .orElseThrow(SessionBranchService::forbidden);
    if (user.getTenantId() == null || !Objects.equals(user.getTenantId(), principal.tenantId())) {
      throw forbidden();
    }
    return user;
  }

  private static ApiException forbidden() {
    return new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Access denied");
  }
}
