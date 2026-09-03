package com.nammamedmate.server.feature.tenant;

import com.nammamedmate.server.application.tenant.TenantRegistrationResult;
import com.nammamedmate.server.application.tenant.TenantRegistrationService;
import com.nammamedmate.server.application.tenant.TenantVerifyResult;
import com.nammamedmate.server.shared.web.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/tenants")
public class TenantController {

  private final TenantRegistrationService tenantRegistrationService;

  public TenantController(TenantRegistrationService tenantRegistrationService) {
    this.tenantRegistrationService = tenantRegistrationService;
  }

  @PostMapping("/register")
  public ApiResponse<TenantRegistrationResponse> register(
      @Valid @RequestBody RegisterTenantRequest request) {
    TenantRegistrationResult result =
        tenantRegistrationService.register(
            request.businessName(), request.email(), request.phone(), request.password());
    return ApiResponse.ok(new TenantRegistrationResponse(result.tenantId(), result.email()));
  }

  @PostMapping("/verify-email")
  public ApiResponse<TenantVerifyResponse> verifyEmail(
      @Valid @RequestBody VerifyTenantEmailRequest request) {
    TenantVerifyResult result = tenantRegistrationService.verifyEmail(request.token());
    return ApiResponse.ok(new TenantVerifyResponse(result.tenantId(), result.email()));
  }
}
