package com.nammamedmate.server.feature.staff;

import com.nammamedmate.server.application.staff.StaffOnboardingService;
import com.nammamedmate.server.application.staff.StaffVerification;
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
@RequestMapping("/api/v1/admin/staff-verifications")
public class StaffVerificationController {

  private final StaffOnboardingService staffOnboardingService;

  public StaffVerificationController(StaffOnboardingService staffOnboardingService) {
    this.staffOnboardingService = staffOnboardingService;
  }

  @GetMapping
  public ApiResponse<StaffVerificationListResponse> list(Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        new StaffVerificationListResponse(
            staffOnboardingService.listPendingVerifications(principal).items().stream()
                .map(StaffVerificationController::toResponse)
                .toList()));
  }

  @PostMapping("/{id}/approve")
  public ApiResponse<StaffVerificationResponse> approve(
      Authentication authentication,
      @PathVariable UUID id,
      @Valid @RequestBody ApproveStaffRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toResponse(staffOnboardingService.approve(principal, id, request.evidenceReference())));
  }

  private static StaffVerificationResponse toResponse(StaffVerification verification) {
    return new StaffVerificationResponse(
        verification.id(),
        verification.userId(),
        verification.tenantId(),
        verification.email(),
        verification.displayName(),
        verification.kind(),
        verification.licenseNumber(),
        verification.evidenceReference(),
        verification.status(),
        verification.reviewedBy(),
        verification.reviewedAt(),
        verification.createdAt());
  }
}
