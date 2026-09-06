package com.nammamedmate.server.feature.finance;

import com.nammamedmate.server.application.finance.FinanceReportCatalogView;
import com.nammamedmate.server.application.finance.FinanceReportExport;
import com.nammamedmate.server.application.finance.FinanceReportService;
import com.nammamedmate.server.application.finance.FinanceReportTableView;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.shared.web.ApiResponse;
import java.time.LocalDate;
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
@RequestMapping("/api/v1/finance/reports")
public class FinanceReportController {

  private final FinanceReportService financeReportService;

  public FinanceReportController(FinanceReportService financeReportService) {
    this.financeReportService = financeReportService;
  }

  @GetMapping
  public ApiResponse<FinanceReportCatalogView> catalog(
      Authentication authentication,
      @RequestParam(required = false) String branchId,
      @RequestParam(required = false) String scope) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(financeReportService.catalog(principal, branchId, scope));
  }

  @GetMapping("/{key}")
  public ApiResponse<FinanceReportTableView> table(
      Authentication authentication,
      @PathVariable String key,
      @RequestParam(required = false) LocalDate from,
      @RequestParam(required = false) LocalDate to,
      @RequestParam(required = false) String branchId,
      @RequestParam(required = false) String scope) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(financeReportService.table(principal, key, from, to, branchId, scope));
  }

  @GetMapping("/{key}/export")
  public ResponseEntity<byte[]> export(
      Authentication authentication,
      @PathVariable String key,
      @RequestParam(required = false) String format,
      @RequestParam(required = false) LocalDate from,
      @RequestParam(required = false) LocalDate to,
      @RequestParam(required = false) String branchId,
      @RequestParam(required = false) String scope) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    FinanceReportExport file =
        financeReportService.export(principal, key, format, from, to, branchId, scope);
    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + file.filename() + "\"")
        .contentType(MediaType.parseMediaType(file.contentType()))
        .body(file.body());
  }
}
