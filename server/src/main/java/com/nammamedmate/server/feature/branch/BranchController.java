package com.nammamedmate.server.feature.branch;

import com.nammamedmate.server.application.branch.BranchService;
import com.nammamedmate.server.application.branch.BranchView;
import com.nammamedmate.server.domain.BranchStatus;
import com.nammamedmate.server.domain.BranchType;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.shared.web.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
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
@RequestMapping("/api/v1/branches")
public class BranchController {

  private final BranchService branchService;

  public BranchController(BranchService branchService) {
    this.branchService = branchService;
  }

  @GetMapping
  public ApiResponse<BranchListResponse> list(Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        new BranchListResponse(
            branchService.listForOwner(principal).stream().map(this::toResponse).toList()));
  }

  @GetMapping("/{id}")
  public ApiResponse<BranchResponse> get(Authentication authentication, @PathVariable UUID id) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toResponse(branchService.getForOwner(principal, id)));
  }

  @PostMapping
  public ApiResponse<BranchResponse> create(
      Authentication authentication, @Valid @RequestBody CreateBranchRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toResponse(
            branchService.create(
                principal,
                request.name(),
                request.addressLine(),
                request.city(),
                request.state(),
                request.pincode(),
                request.contactPhone(),
                request.contactEmail(),
                request.drugLicenseNumber(),
                request.gstin(),
                request.operatingHours(),
                request.branchType(),
                request.status(),
                request.openingDate(),
                Boolean.TRUE.equals(request.defaultBranch()),
                Boolean.TRUE.equals(request.linkedWarehouse()),
                request.pricingSettings(),
                request.taxSettings())));
  }

  @PatchMapping("/{id}")
  public ApiResponse<BranchResponse> update(
      Authentication authentication,
      @PathVariable UUID id,
      @Valid @RequestBody UpdateBranchRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toResponse(
            branchService.update(
                principal,
                id,
                request.name(),
                request.addressLine(),
                request.city(),
                request.state(),
                request.pincode(),
                request.contactPhone(),
                request.contactEmail(),
                request.drugLicenseNumber(),
                request.gstin(),
                request.operatingHours(),
                request.branchType(),
                request.status(),
                request.openingDate(),
                request.defaultBranch(),
                request.linkedWarehouse(),
                request.pricingSettings(),
                request.taxSettings())));
  }

  @PostMapping("/{id}/copy-settings")
  public ApiResponse<BranchResponse> copySettings(
      Authentication authentication,
      @PathVariable UUID id,
      @Valid @RequestBody CopyBranchSettingsRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toResponse(branchService.copySettings(principal, id, request.sourceBranchId())));
  }

  private BranchResponse toResponse(BranchView view) {
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

  public record BranchListResponse(List<BranchResponse> items) {}

  public record BranchResponse(
      UUID id,
      UUID tenantId,
      String name,
      String branchCode,
      String addressLine,
      String city,
      String state,
      String pincode,
      String contactPhone,
      String contactEmail,
      String drugLicenseNumber,
      String gstin,
      Map<String, Object> operatingHours,
      String branchType,
      String status,
      LocalDate openingDate,
      boolean defaultBranch,
      boolean linkedWarehouse,
      Map<String, Object> pricingSettings,
      Map<String, Object> taxSettings,
      Instant createdAt,
      Instant updatedAt) {}

  public record CreateBranchRequest(
      @NotBlank String name,
      @NotBlank String addressLine,
      @NotBlank String city,
      @NotBlank String state,
      @NotBlank String pincode,
      @NotBlank String contactPhone,
      String contactEmail,
      @NotBlank String drugLicenseNumber,
      String gstin,
      Map<String, Object> operatingHours,
      @NotNull BranchType branchType,
      BranchStatus status,
      LocalDate openingDate,
      Boolean defaultBranch,
      Boolean linkedWarehouse,
      Map<String, Object> pricingSettings,
      Map<String, Object> taxSettings) {}

  public record UpdateBranchRequest(
      String name,
      String addressLine,
      String city,
      String state,
      String pincode,
      String contactPhone,
      String contactEmail,
      String drugLicenseNumber,
      String gstin,
      Map<String, Object> operatingHours,
      BranchType branchType,
      BranchStatus status,
      LocalDate openingDate,
      Boolean defaultBranch,
      Boolean linkedWarehouse,
      Map<String, Object> pricingSettings,
      Map<String, Object> taxSettings) {}

  public record CopyBranchSettingsRequest(@NotNull UUID sourceBranchId) {}
}
