package com.nammamedmate.server.feature.tenant;

import com.nammamedmate.server.application.branch.BranchService;
import com.nammamedmate.server.application.branch.BranchView;
import com.nammamedmate.server.application.tenant.TenantLifecycleService;
import com.nammamedmate.server.application.tenant.TenantLifecycleView;
import com.nammamedmate.server.feature.branch.BranchController.BranchListResponse;
import com.nammamedmate.server.feature.branch.BranchController.BranchResponse;
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
  private final BranchService branchService;

  public AdminTenantController(
      TenantLifecycleService tenantLifecycleService, BranchService branchService) {
    this.tenantLifecycleService = tenantLifecycleService;
    this.branchService = branchService;
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

  @GetMapping("/{id}/branches")
  public ApiResponse<BranchListResponse> listBranches(
      Authentication authentication, @PathVariable UUID id) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        new BranchListResponse(
            branchService.listForAdmin(principal, id).stream()
                .map(AdminTenantController::toBranchResponse)
                .toList()));
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

  private static BranchResponse toBranchResponse(BranchView view) {
    return new BranchResponse(
        view.id(),
        view.tenantId(),
        view.name(),
        view.branchCode(),
        view.addressLine(),
        view.city(),
        view.state(),
        view.pincode(),
        view.contactPhone(),
        view.contactEmail(),
        view.drugLicenseNumber(),
        view.gstin(),
        view.operatingHours(),
        view.branchType().name(),
        view.status().name(),
        view.openingDate(),
        view.defaultBranch(),
        view.linkedWarehouse(),
        view.pricingSettings(),
        view.taxSettings(),
        view.createdAt(),
        view.updatedAt());
  }
}
