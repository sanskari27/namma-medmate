package com.nammamedmate.server.feature.tenant;

import com.nammamedmate.server.application.kyc.KycDocumentView;
import com.nammamedmate.server.application.kyc.KycOwnerStatus;
import com.nammamedmate.server.application.kyc.KycService;
import com.nammamedmate.server.application.tenant.TenantRegistrationResult;
import com.nammamedmate.server.application.tenant.TenantRegistrationService;
import com.nammamedmate.server.application.tenant.TenantVerifyResult;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.shared.web.ApiResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/tenants")
public class TenantController {

  private final TenantRegistrationService tenantRegistrationService;
  private final KycService kycService;

  public TenantController(
      TenantRegistrationService tenantRegistrationService, KycService kycService) {
    this.tenantRegistrationService = tenantRegistrationService;
    this.kycService = kycService;
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

  @GetMapping("/{id}/kyc")
  public ApiResponse<TenantKycStatusResponse> getKyc(
      Authentication authentication, @PathVariable("id") UUID tenantId) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toStatus(kycService.ownerStatus(principal, tenantId)));
  }

  @PostMapping(path = "/{id}/kyc", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ApiResponse<TenantKycStatusResponse> submitKyc(
      Authentication authentication,
      @PathVariable("id") UUID tenantId,
      @RequestParam("legalName") String legalName,
      @RequestParam("drugLicenseNumber") String drugLicenseNumber,
      @RequestParam("pan") String pan,
      @RequestParam(value = "gstin", required = false) String gstin,
      @RequestParam("addressLine1") String addressLine1,
      @RequestParam("city") String city,
      @RequestParam("state") String state,
      @RequestParam("pincode") String pincode,
      @RequestParam("contactPhone") String contactPhone,
      @RequestPart(value = "drugLicense", required = false) MultipartFile drugLicense,
      @RequestPart(value = "panDocument", required = false) MultipartFile panDocument,
      @RequestPart(value = "gstCertificate", required = false) MultipartFile gstCertificate) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toStatus(
            kycService.submit(
                principal,
                tenantId,
                legalName,
                drugLicenseNumber,
                pan,
                gstin,
                addressLine1,
                city,
                state,
                pincode,
                contactPhone,
                drugLicense,
                panDocument,
                gstCertificate)));
  }

  private static TenantKycStatusResponse toStatus(KycOwnerStatus status) {
    return new TenantKycStatusResponse(
        status.tenantId(),
        status.tenantStatus(),
        status.emailVerified(),
        status.status() == null ? null : status.status().name(),
        status.rejectionReason(),
        status.submittedAt(),
        status.reviewedAt(),
        status.submissionId(),
        toDocs(status.documents()));
  }

  private static List<TenantKycDocumentResponse> toDocs(List<KycDocumentView> documents) {
    return documents.stream()
        .map(
            doc ->
                new TenantKycDocumentResponse(
                    doc.id(),
                    doc.docType().name(),
                    doc.contentType(),
                    doc.byteSize(),
                    doc.originalFilename()))
        .toList();
  }
}
