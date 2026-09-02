package com.nammamedmate.server.feature.access;

import com.nammamedmate.server.application.access.AccessRoleCatalog;
import com.nammamedmate.server.application.access.AccessRoleService;
import com.nammamedmate.server.application.access.AccessRoleView;
import com.nammamedmate.server.application.access.CreateAccessRoleCommand;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.shared.web.ApiResponse;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/roles")
public class AccessRoleController {

  private final AccessRoleService accessRoleService;

  public AccessRoleController(AccessRoleService accessRoleService) {
    this.accessRoleService = accessRoleService;
  }

  @GetMapping
  public ApiResponse<AccessRoleListResponse> list(Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    AccessRoleCatalog catalog = accessRoleService.list(principal);
    return ApiResponse.ok(new AccessRoleListResponse(catalog.roles(), catalog.catalog()));
  }

  @PostMapping
  public ApiResponse<AccessRoleView> create(
      @Valid @RequestBody CreateAccessRoleRequest request, Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        accessRoleService.create(
            principal, new CreateAccessRoleCommand(request.name(), request.modules())));
  }

  @PatchMapping("/{id}")
  public ApiResponse<AccessRoleView> patch(
      @PathVariable UUID id,
      @Valid @RequestBody PatchAccessRoleRequest request,
      Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        accessRoleService.patch(
            principal, id, request.name(), request.modules(), request.version()));
  }

  @PostMapping("/{id}/deactivate")
  public ApiResponse<AccessRoleView> deactivate(
      @PathVariable UUID id, Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(accessRoleService.deactivate(principal, id));
  }
}
