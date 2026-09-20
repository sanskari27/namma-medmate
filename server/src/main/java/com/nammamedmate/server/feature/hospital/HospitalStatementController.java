package com.nammamedmate.server.feature.hospital;

import com.nammamedmate.server.application.hospital.HospitalStatementExport;
import com.nammamedmate.server.application.hospital.HospitalStatementService;
import com.nammamedmate.server.application.hospital.HospitalStatementView;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.shared.web.ApiResponse;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/hospital/statement")
public class HospitalStatementController {

  private final HospitalStatementService hospitalStatementService;

  public HospitalStatementController(HospitalStatementService hospitalStatementService) {
    this.hospitalStatementService = hospitalStatementService;
  }

  @GetMapping
  public ApiResponse<StatementResponse> get(
      Authentication authentication,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
      @RequestParam(required = false, defaultValue = "false") boolean includePatient) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toResponse(hospitalStatementService.get(principal, from, to, includePatient)));
  }

  @GetMapping("/export")
  public ResponseEntity<byte[]> export(
      Authentication authentication,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
      @RequestParam(required = false, defaultValue = "false") boolean includePatient,
      @RequestParam String format) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    HospitalStatementExport file =
        hospitalStatementService.export(principal, from, to, includePatient, format);
    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + file.filename() + "\"")
        .contentType(MediaType.parseMediaType(file.contentType()))
        .body(file.content());
  }

  private static StatementResponse toResponse(HospitalStatementView view) {
    return new StatementResponse(
        view.openingPaise(),
        view.suppliedPaise(),
        view.creditsPaise(),
        view.closingPaise(),
        view.balancePaise(),
        view.accountVersion(),
        view.institutionName(),
        new AgingResponse(
            view.ageing().d0_30(),
            view.ageing().d31_60(),
            view.ageing().d61_90(),
            view.ageing().d90Plus(),
            view.ageing().overduePaise(),
            view.ageing().oldestDaysPastDue()),
        view.lines().stream()
            .map(
                line ->
                    new LineResponse(
                        line.occurredAt(),
                        line.kind(),
                        line.particulars(),
                        line.debitPaise(),
                        line.creditPaise(),
                        line.balancePaise()))
            .toList());
  }

  public record StatementResponse(
      long openingPaise,
      long suppliedPaise,
      long creditsPaise,
      long closingPaise,
      long balancePaise,
      long accountVersion,
      String institutionName,
      AgingResponse ageing,
      List<LineResponse> lines) {}

  public record AgingResponse(
      long d0_30,
      long d31_60,
      long d61_90,
      long d90Plus,
      long overduePaise,
      int oldestDaysPastDue) {}

  public record LineResponse(
      Instant occurredAt,
      String kind,
      String particulars,
      long debitPaise,
      long creditPaise,
      long balancePaise) {}
}
