package com.nammamedmate.server.feature.access;

import com.nammamedmate.server.application.access.AccessRoleService;
import com.nammamedmate.server.application.access.UserAccessRoles;
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
public class UserRoleController {

  private final AccessRoleService accessRoleService;

  public UserRoleController(AccessRoleService accessRoleService) {
    this.accessRoleService = accessRoleService;
  }

  @GetMapping("/{id}/roles")
  public ApiResponse<UserRolesResponse> list(@PathVariable UUID id, Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toResponse(accessRoleService.listUserRoles(principal, id)));
  }

  @PutMapping("/{id}/roles")
  public ApiResponse<UserRolesResponse> replace(
      @PathVariable UUID id,
      @Valid @RequestBody ReplaceUserRolesRequest request,
      Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    List<UUID> roleIds = request.roleIds() == null ? List.of() : request.roleIds();
    return ApiResponse.ok(toResponse(accessRoleService.replaceUserRoles(principal, id, roleIds)));
  }

  @PostMapping("/{id}/roles")
  public ApiResponse<UserRolesResponse> add(
      @PathVariable UUID id,
      @Valid @RequestBody AddUserRoleRequest request,
      Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toResponse(accessRoleService.addUserRole(principal, id, request.roleId())));
  }

  @DeleteMapping("/{id}/roles/{roleId}")
  public ApiResponse<UserRolesResponse> remove(
      @PathVariable UUID id, @PathVariable UUID roleId, Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toResponse(accessRoleService.removeUserRole(principal, id, roleId)));
  }

  private static UserRolesResponse toResponse(UserAccessRoles roles) {
    return new UserRolesResponse(roles.userId(), roles.roles());
  }
}
