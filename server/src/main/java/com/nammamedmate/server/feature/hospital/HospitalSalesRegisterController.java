package com.nammamedmate.server.feature.hospital;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.nammamedmate.server.application.hospital.HospitalSalesRegisterExport;
import com.nammamedmate.server.application.hospital.HospitalSalesRegisterRow;
import com.nammamedmate.server.application.hospital.HospitalSalesRegisterService;
import com.nammamedmate.server.application.hospital.HospitalSalesRegisterTile;
import com.nammamedmate.server.application.hospital.HospitalSalesRegisterTotals;
import com.nammamedmate.server.application.hospital.HospitalSalesRegisterView;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.shared.web.ApiResponse;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
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
@RequestMapping("/api/v1/hospital/sales-register")
public class HospitalSalesRegisterController {

  private final HospitalSalesRegisterService hospitalSalesRegisterService;

  public HospitalSalesRegisterController(
      HospitalSalesRegisterService hospitalSalesRegisterService) {
    this.hospitalSalesRegisterService = hospitalSalesRegisterService;
  }

  @GetMapping
  public ApiResponse<RegisterResponse> get(
      Authentication authentication,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
      @RequestParam(required = false) String source,
      @RequestParam(required = false) String paymentMode,
      @RequestParam(required = false) String paid,
      @RequestParam(required = false) String insurer,
      @RequestParam(required = false) String wardId,
      @RequestParam(required = false) String q,
      @RequestParam(required = false) String branchId) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toResponse(
            hospitalSalesRegisterService.get(
                principal, from, to, source, paymentMode, paid, insurer, wardId, q, branchId)));
  }

  @GetMapping("/export")
  public ResponseEntity<byte[]> export(
      Authentication authentication,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
      @RequestParam(required = false) String source,
      @RequestParam(required = false) String paymentMode,
      @RequestParam(required = false) String paid,
      @RequestParam(required = false) String insurer,
      @RequestParam(required = false) String wardId,
      @RequestParam(required = false) String q,
      @RequestParam(required = false) String branchId,
      @RequestParam String format) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    HospitalSalesRegisterExport file =
        hospitalSalesRegisterService.export(
            principal, from, to, source, paymentMode, paid, insurer, wardId, q, branchId, format);
    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + file.filename() + "\"")
        .contentType(MediaType.parseMediaType(file.contentType()))
        .body(file.body());
  }

  private static RegisterResponse toResponse(HospitalSalesRegisterView view) {
    return new RegisterResponse(
        view.tiles().stream().map(HospitalSalesRegisterController::toTile).toList(),
        toTotals(view.totals()),
        view.items().stream().map(HospitalSalesRegisterController::toRow).toList());
  }

  private static TileResponse toTile(HospitalSalesRegisterTile tile) {
    return new TileResponse(tile.source(), tile.count(), tile.revenuePaise());
  }

  private static TotalsResponse toTotals(HospitalSalesRegisterTotals totals) {
    return new TotalsResponse(
        totals.count(),
        totals.revenuePaise(),
        totals.paidPaise(),
        totals.unpaidPaise(),
        totals.insurancePaise());
  }

  private static RowResponse toRow(HospitalSalesRegisterRow row) {
    return new RowResponse(
        row.id(),
        row.invoiceNumber(),
        row.completedAt(),
        row.saleSource(),
        row.uhid(),
        row.wardId(),
        row.wardName(),
        row.patientName(),
        row.phone(),
        row.paymentModes(),
        row.insurerName(),
        row.totalPaise(),
        row.amountPaidPaise(),
        row.amountDuePaise(),
        row.insurancePaise());
  }

  public record RegisterResponse(
      List<TileResponse> tiles, TotalsResponse totals, List<RowResponse> items) {}

  public record TileResponse(String source, long count, long revenuePaise) {}

  public record TotalsResponse(
      long count, long revenuePaise, long paidPaise, long unpaidPaise, long insurancePaise) {}

  @JsonInclude(JsonInclude.Include.NON_NULL)
  public record RowResponse(
      UUID id,
      String invoiceNumber,
      Instant completedAt,
      String saleSource,
      String uhid,
      UUID wardId,
      String wardName,
      String patientName,
      String phone,
      List<String> paymentModes,
      String insurerName,
      long totalPaise,
      long amountPaidPaise,
      long amountDuePaise,
      long insurancePaise) {}
}
