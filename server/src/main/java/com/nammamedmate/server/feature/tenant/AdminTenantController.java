package com.nammamedmate.server.feature.tenant;

import com.nammamedmate.server.application.tenant.TenantLifecycleService;
import com.nammamedmate.server.application.tenant.TenantLifecycleView;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.shared.web.ApiResponse;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/tenants")
public class AdminTenantController {

  private final TenantLifecycleService tenantLifecycleService;

  public AdminTenantController(TenantLifecycleService tenantLifecycleService) {
    this.tenantLifecycleService = tenantLifecycleService;
  }

  @GetMapping
  public ApiResponse<AdminTenantListResponse> list(Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        new AdminTenantListResponse(
            tenantLifecycleService.list(principal).stream()
                .map(AdminTenantController::toResponse)
                .toList()));
  }

  @PostMapping("/{id}/status")
  public ApiResponse<AdminTenantResponse> updateStatus(
      Authentication authentication,
      @PathVariable UUID id,
      @Valid @RequestBody UpdateTenantStatusRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toResponse(
            tenantLifecycleService.updateStatus(
                principal, id, request.status(), request.expectedStatus(), request.reason())));
  }

  private static AdminTenantResponse toResponse(TenantLifecycleView view) {
    return new AdminTenantResponse(
        view.id(),
        view.name(),
        view.slug(),
        view.status().name(),
        view.updatedAt(),
        view.allowedTransitions().stream().map(Enum::name).toList());
  }
}
