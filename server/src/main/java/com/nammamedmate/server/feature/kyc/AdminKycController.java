package com.nammamedmate.server.feature.kyc;

import com.nammamedmate.server.application.kyc.KycDocumentView;
import com.nammamedmate.server.application.kyc.KycPackView;
import com.nammamedmate.server.application.kyc.KycService;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.shared.web.ApiResponse;
import jakarta.validation.Valid;
import java.nio.file.Files;
import java.util.List;
import java.util.UUID;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/kyc")
public class AdminKycController {

  private final KycService kycService;

  public AdminKycController(KycService kycService) {
    this.kycService = kycService;
  }

  @GetMapping
  public ApiResponse<AdminKycListResponse> list(Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        new AdminKycListResponse(
            kycService.listPending(principal).items().stream()
                .map(AdminKycController::toResponse)
                .toList()));
  }

  @GetMapping("/{id}")
  public ApiResponse<AdminKycPackResponse> get(
      Authentication authentication, @PathVariable UUID id) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toResponse(kycService.getPack(principal, id)));
  }

  @GetMapping("/{id}/documents/{documentId}")
  public ResponseEntity<Resource> document(
      Authentication authentication, @PathVariable UUID id, @PathVariable UUID documentId)
      throws Exception {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    KycService.DocumentStream stream = kycService.openDocument(principal, id, documentId);
    Resource resource = new FileSystemResource(stream.path());
    return ResponseEntity.ok()
        .header(
            HttpHeaders.CONTENT_DISPOSITION,
            "inline; filename=\"" + stream.filename().replace("\"", "") + "\"")
        .contentType(MediaType.parseMediaType(stream.contentType()))
        .contentLength(Files.size(stream.path()))
        .body(resource);
  }

  @PostMapping("/{id}/approve")
  public ApiResponse<AdminKycPackResponse> approve(
      Authentication authentication, @PathVariable UUID id) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toResponse(kycService.approve(principal, id)));
  }

  @PostMapping("/{id}/reject")
  public ApiResponse<AdminKycPackResponse> reject(
      Authentication authentication,
      @PathVariable UUID id,
      @Valid @RequestBody RejectKycRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toResponse(kycService.reject(principal, id, request.reason())));
  }

  private static AdminKycPackResponse toResponse(KycPackView pack) {
    return new AdminKycPackResponse(
        pack.id(),
        pack.tenantId(),
        pack.tenantName(),
        pack.legalName(),
        pack.drugLicenseNumber(),
        pack.pan(),
        pack.gstin(),
        pack.addressLine1(),
        pack.city(),
        pack.state(),
        pack.pincode(),
        pack.contactPhone(),
        pack.status().name(),
        pack.rejectionReason(),
        pack.submittedAt(),
        pack.reviewedBy(),
        pack.reviewedAt(),
        pack.version(),
        toDocs(pack.documents()));
  }

  private static List<AdminKycDocumentResponse> toDocs(List<KycDocumentView> documents) {
    return documents.stream()
        .map(
            doc ->
                new AdminKycDocumentResponse(
                    doc.id(),
                    doc.docType().name(),
                    doc.contentType(),
                    doc.byteSize(),
                    doc.originalFilename()))
        .toList();
  }
}
