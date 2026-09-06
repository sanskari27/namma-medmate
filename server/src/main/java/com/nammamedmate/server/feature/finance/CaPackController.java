package com.nammamedmate.server.feature.finance;

import com.nammamedmate.server.application.finance.CaPackService;
import com.nammamedmate.server.application.finance.CaPackView;
import com.nammamedmate.server.application.finance.FinanceReportExport;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.shared.web.ApiResponse;
import java.time.LocalDate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/finance/ca-pack")
public class CaPackController {

  private final CaPackService caPackService;

  public CaPackController(CaPackService caPackService) {
    this.caPackService = caPackService;
  }

  @GetMapping
  public ApiResponse<CaPackView> preview(
      Authentication authentication,
      @RequestParam(required = false) LocalDate from,
      @RequestParam(required = false) LocalDate to,
      @RequestParam(required = false) String branchId,
      @RequestParam(required = false) String scope) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(caPackService.preview(principal, from, to, branchId, scope));
  }

  @GetMapping("/export")
  public ResponseEntity<byte[]> export(
      Authentication authentication,
      @RequestParam(required = false) String format,
      @RequestParam(required = false) LocalDate from,
      @RequestParam(required = false) LocalDate to,
      @RequestParam(required = false) String branchId,
      @RequestParam(required = false) String scope) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    FinanceReportExport file = caPackService.export(principal, format, from, to, branchId, scope);
    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + file.filename() + "\"")
        .contentType(MediaType.parseMediaType(file.contentType()))
        .body(file.body());
  }
}
