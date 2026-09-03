package com.nammamedmate.server.feature.session;

import com.nammamedmate.server.application.branch.AssignedBranchView;
import com.nammamedmate.server.application.branch.SessionBranchService;
import com.nammamedmate.server.application.branch.SessionBranchView;
import com.nammamedmate.server.feature.branch.AssignedBranchResponse;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.shared.web.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/session")
public class SessionBranchController {

  private final SessionBranchService sessionBranchService;

  public SessionBranchController(SessionBranchService sessionBranchService) {
    this.sessionBranchService = sessionBranchService;
  }

  @PostMapping("/branch")
  public ApiResponse<SessionBranchResponse> switchBranch(
      @Valid @RequestBody SwitchBranchRequest request, Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    SessionBranchView view = sessionBranchService.switchBranch(principal, request.branchId());
    return ApiResponse.ok(toResponse(view));
  }

  private static SessionBranchResponse toResponse(SessionBranchView view) {
    return new SessionBranchResponse(
        view.activeBranchId(),
        view.branches().stream().map(SessionBranchController::toItem).toList());
  }

  private static AssignedBranchResponse toItem(AssignedBranchView branch) {
    return new AssignedBranchResponse(
        branch.id(), branch.name(), branch.branchCode(), branch.status().name());
  }
}
