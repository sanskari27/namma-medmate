package com.nammamedmate.server.feature.branch;

import com.nammamedmate.server.application.branch.AssignedBranchView;
import com.nammamedmate.server.application.branch.BranchAssignmentService;
import com.nammamedmate.server.application.branch.UserBranches;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.shared.web.ApiResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users")
public class UserBranchController {

  private final BranchAssignmentService branchAssignmentService;

  public UserBranchController(BranchAssignmentService branchAssignmentService) {
    this.branchAssignmentService = branchAssignmentService;
  }

  @GetMapping("/{id}/branches")
  public ApiResponse<UserBranchesResponse> list(
      @PathVariable UUID id, Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toResponse(branchAssignmentService.listUserBranches(principal, id)));
  }

  @PutMapping("/{id}/branches")
  public ApiResponse<UserBranchesResponse> replace(
      @PathVariable UUID id,
      @Valid @RequestBody ReplaceUserBranchesRequest request,
      Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    List<UUID> branchIds = request.branchIds() == null ? List.of() : request.branchIds();
    return ApiResponse.ok(
        toResponse(branchAssignmentService.replaceUserBranches(principal, id, branchIds)));
  }

  @PostMapping("/{id}/branches")
  public ApiResponse<UserBranchesResponse> add(
      @PathVariable UUID id,
      @Valid @RequestBody AddUserBranchRequest request,
      Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toResponse(branchAssignmentService.addUserBranch(principal, id, request.branchId())));
  }

  @DeleteMapping("/{id}/branches/{branchId}")
  public ApiResponse<UserBranchesResponse> remove(
      @PathVariable UUID id, @PathVariable UUID branchId, Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toResponse(branchAssignmentService.removeUserBranch(principal, id, branchId)));
  }

  private static UserBranchesResponse toResponse(UserBranches branches) {
    return new UserBranchesResponse(
        branches.userId(), branches.branches().stream().map(UserBranchController::toItem).toList());
  }

  private static AssignedBranchResponse toItem(AssignedBranchView view) {
    return new AssignedBranchResponse(
        view.id(), view.name(), view.branchCode(), view.status().name());
  }
}
