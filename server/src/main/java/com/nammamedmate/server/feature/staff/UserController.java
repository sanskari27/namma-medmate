package com.nammamedmate.server.feature.staff;

import com.nammamedmate.server.application.staff.CreateStaffCommand;
import com.nammamedmate.server.application.staff.StaffAccount;
import com.nammamedmate.server.application.staff.StaffOnboardingService;
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
@RequestMapping("/api/v1/users")
public class UserController {

  private final StaffOnboardingService staffOnboardingService;

  public UserController(StaffOnboardingService staffOnboardingService) {
    this.staffOnboardingService = staffOnboardingService;
  }

  @PostMapping
  public ApiResponse<StaffUserResponse> create(
      @Valid @RequestBody CreateStaffRequest request, Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toResponse(
            staffOnboardingService.create(
                principal,
                new CreateStaffCommand(
                    request.displayName(),
                    request.phone(),
                    request.email(),
                    request.password(),
                    request.role(),
                    request.kind(),
                    request.licenseNumber()))));
  }

  @GetMapping
  public ApiResponse<StaffUserListResponse> list(Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        new StaffUserListResponse(
            staffOnboardingService.list(principal).items().stream()
                .map(UserController::toResponse)
                .toList()));
  }

  @PostMapping("/{id}/deactivate")
  public ApiResponse<StaffUserResponse> deactivate(
      Authentication authentication, @PathVariable UUID id) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toResponse(staffOnboardingService.deactivate(principal, id)));
  }

  static StaffUserResponse toResponse(StaffAccount account) {
    return new StaffUserResponse(
        account.id(),
        account.email(),
        account.displayName(),
        account.phone(),
        account.role(),
        account.status(),
        account.kind(),
        account.licenseNumber(),
        account.registrationId(),
        account.createdBy(),
        account.mustChangePassword(),
        account.createdAt());
  }
}
