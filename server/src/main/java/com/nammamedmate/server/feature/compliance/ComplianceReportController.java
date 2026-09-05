package com.nammamedmate.server.feature.compliance;

import com.nammamedmate.server.application.compliance.ComplianceReportCatalogView;
import com.nammamedmate.server.application.compliance.ComplianceReportExport;
import com.nammamedmate.server.application.compliance.ComplianceReportService;
import com.nammamedmate.server.application.compliance.ComplianceReportTableView;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.shared.web.ApiResponse;
import java.time.Instant;
import java.util.UUID;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/compliance/reports")
public class ComplianceReportController {

  private final ComplianceReportService complianceReportService;

  public ComplianceReportController(ComplianceReportService complianceReportService) {
    this.complianceReportService = complianceReportService;
  }

  @GetMapping
  public ApiResponse<ComplianceReportCatalogView> catalog(
      Authentication authentication, @RequestParam(required = false) UUID branchId) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(complianceReportService.catalog(principal, branchId));
  }

  @GetMapping("/{key}")
  public ApiResponse<ComplianceReportTableView> table(
      Authentication authentication,
      @PathVariable String key,
      @RequestParam(required = false) UUID branchId,
      @RequestParam(required = false) Instant from,
      @RequestParam(required = false) Instant to,
      @RequestParam(required = false) UUID productId,
      @RequestParam(required = false) UUID supplierId,
      @RequestParam(required = false) String batchNumber) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        complianceReportService.table(
            principal, key, branchId, from, to, productId, supplierId, batchNumber));
  }

  @GetMapping("/{key}/export")
  public ResponseEntity<byte[]> export(
      Authentication authentication,
      @PathVariable String key,
      @RequestParam(required = false) String format,
      @RequestParam(required = false) UUID branchId,
      @RequestParam(required = false) Instant from,
      @RequestParam(required = false) Instant to,
      @RequestParam(required = false) UUID productId,
      @RequestParam(required = false) UUID supplierId,
      @RequestParam(required = false) String batchNumber) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    ComplianceReportExport file =
        complianceReportService.export(
            principal, key, format, branchId, from, to, productId, supplierId, batchNumber);
    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + file.filename() + "\"")
        .contentType(MediaType.parseMediaType(file.contentType()))
        .body(file.body());
  }
}
