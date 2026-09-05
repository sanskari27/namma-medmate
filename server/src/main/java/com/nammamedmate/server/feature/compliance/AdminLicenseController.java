package com.nammamedmate.server.feature.compliance;

import com.nammamedmate.server.application.compliance.AdminDueLicenseView;
import com.nammamedmate.server.application.compliance.LicenseService;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.shared.web.ApiResponse;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/compliance/licenses")
public class AdminLicenseController {

  private final LicenseService licenseService;

  public AdminLicenseController(LicenseService licenseService) {
    this.licenseService = licenseService;
  }

  @GetMapping("/due")
  public ApiResponse<DueResponse> due(Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        new DueResponse(
            licenseService.listPlatformDue(principal).stream()
                .map(AdminLicenseController::toItem)
                .toList()));
  }

  private static DueItem toItem(AdminDueLicenseView view) {
    return new DueItem(
        view.id(),
        view.tenantId(),
        view.tenantName(),
        view.branchId(),
        view.branchName(),
        view.staffUserId(),
        view.staffDisplayName(),
        view.docType().name(),
        view.scope().name(),
        view.licenseNumber(),
        view.issuedOn(),
        view.expiresOn(),
        view.due());
  }

  public record DueResponse(List<DueItem> items) {}

  public record DueItem(
      UUID id,
      UUID tenantId,
      String tenantName,
      UUID branchId,
      String branchName,
      UUID staffUserId,
      String staffDisplayName,
      String docType,
      String scope,
      String licenseNumber,
      LocalDate issuedOn,
      LocalDate expiresOn,
      boolean due) {}
}
