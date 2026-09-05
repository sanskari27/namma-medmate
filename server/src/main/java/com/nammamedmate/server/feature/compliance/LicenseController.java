package com.nammamedmate.server.feature.compliance;

import com.nammamedmate.server.application.compliance.LicenseEvidenceStream;
import com.nammamedmate.server.application.compliance.LicenseService;
import com.nammamedmate.server.application.compliance.LicenseView;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.shared.web.ApiResponse;
import java.nio.file.Files;
import java.time.Instant;
import java.time.LocalDate;
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
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/compliance/licenses")
public class LicenseController {

  private final LicenseService licenseService;

  public LicenseController(LicenseService licenseService) {
    this.licenseService = licenseService;
  }

  @GetMapping
  public ApiResponse<ListResponse> list(Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        new ListResponse(
            licenseService.list(principal).stream().map(LicenseController::toItem).toList()));
  }

  @GetMapping("/due")
  public ApiResponse<ListResponse> due(Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        new ListResponse(
            licenseService.listDue(principal).stream().map(LicenseController::toItem).toList()));
  }

  @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ApiResponse<LicenseItem> create(
      Authentication authentication,
      @RequestParam("docType") String docType,
      @RequestParam("scope") String scope,
      @RequestParam(value = "branchId", required = false) String branchId,
      @RequestParam(value = "staffUserId", required = false) String staffUserId,
      @RequestParam("licenseNumber") String licenseNumber,
      @RequestParam("issuedOn") String issuedOn,
      @RequestParam("expiresOn") String expiresOn,
      @RequestPart(value = "evidence", required = false) MultipartFile evidence) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toItem(
            licenseService.create(
                principal,
                docType,
                scope,
                branchId,
                staffUserId,
                licenseNumber,
                issuedOn,
                expiresOn,
                evidence)));
  }

  @PostMapping(path = "/{id}/renew", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ApiResponse<LicenseItem> renew(
      Authentication authentication,
      @PathVariable UUID id,
      @RequestParam("licenseNumber") String licenseNumber,
      @RequestParam("issuedOn") String issuedOn,
      @RequestParam("expiresOn") String expiresOn,
      @RequestParam("expectedVersion") Integer expectedVersion,
      @RequestPart(value = "evidence", required = false) MultipartFile evidence) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toItem(
            licenseService.renew(
                principal, id, licenseNumber, issuedOn, expiresOn, expectedVersion, evidence)));
  }

  @GetMapping("/{id}/evidence/{evidenceId}")
  public ResponseEntity<Resource> evidence(
      Authentication authentication, @PathVariable UUID id, @PathVariable UUID evidenceId)
      throws Exception {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    LicenseEvidenceStream stream = licenseService.openEvidence(principal, id, evidenceId);
    Resource resource = new FileSystemResource(stream.path());
    return ResponseEntity.ok()
        .header(
            HttpHeaders.CONTENT_DISPOSITION,
            "inline; filename=\"" + stream.filename().replace("\"", "") + "\"")
        .contentType(MediaType.parseMediaType(stream.contentType()))
        .contentLength(Files.size(stream.path()))
        .body(resource);
  }

  private static LicenseItem toItem(LicenseView view) {
    return new LicenseItem(
        view.id(),
        view.tenantId(),
        view.branchId(),
        view.staffUserId(),
        view.docType().name(),
        view.scope().name(),
        view.licenseNumber(),
        view.issuedOn(),
        view.expiresOn(),
        view.currentEvidenceId(),
        view.version(),
        view.due(),
        view.evidence().stream()
            .map(
                row ->
                    new EvidenceItem(
                        row.id(),
                        row.licenseNumber(),
                        row.issuedOn(),
                        row.expiresOn(),
                        row.contentType(),
                        row.byteSize(),
                        row.uploadedAt()))
            .toList());
  }

  public record ListResponse(List<LicenseItem> items) {}

  public record LicenseItem(
      UUID id,
      UUID tenantId,
      UUID branchId,
      UUID staffUserId,
      String docType,
      String scope,
      String licenseNumber,
      LocalDate issuedOn,
      LocalDate expiresOn,
      UUID currentEvidenceId,
      int version,
      boolean due,
      List<EvidenceItem> evidence) {}

  public record EvidenceItem(
      UUID id,
      String licenseNumber,
      LocalDate issuedOn,
      LocalDate expiresOn,
      String contentType,
      long byteSize,
      Instant uploadedAt) {}
}
