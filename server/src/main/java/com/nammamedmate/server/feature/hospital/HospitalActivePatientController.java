package com.nammamedmate.server.feature.hospital;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.nammamedmate.server.application.hospital.HospitalActivePatientDetailView;
import com.nammamedmate.server.application.hospital.HospitalActivePatientInvoiceView;
import com.nammamedmate.server.application.hospital.HospitalActivePatientListView;
import com.nammamedmate.server.application.hospital.HospitalActivePatientRow;
import com.nammamedmate.server.application.hospital.HospitalPatientSettlementService;
import com.nammamedmate.server.domain.HospitalPolicy;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.shared.web.ApiResponse;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/hospital/active-patients")
public class HospitalActivePatientController {

  private final HospitalPatientSettlementService hospitalPatientSettlementService;

  public HospitalActivePatientController(
      HospitalPatientSettlementService hospitalPatientSettlementService) {
    this.hospitalPatientSettlementService = hospitalPatientSettlementService;
  }

  @GetMapping
  public ApiResponse<ListResponse> list(
      Authentication authentication,
      @RequestParam(required = false) String view,
      @RequestParam(required = false) String q) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    HospitalActivePatientListView result =
        hospitalPatientSettlementService.list(
            principal, HospitalPolicy.parseActivePatientView(view), q);
    return ApiResponse.ok(
        new ListResponse(
            result.items().stream().map(HospitalActivePatientController::toRow).toList()));
  }

  @GetMapping("/casualty/{uhid}")
  public ApiResponse<DetailResponse> casualty(
      Authentication authentication, @PathVariable String uhid) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toDetail(hospitalPatientSettlementService.getCasualty(principal, uhid)));
  }

  @GetMapping("/{admissionId}")
  public ApiResponse<DetailResponse> get(
      Authentication authentication, @PathVariable UUID admissionId) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toDetail(hospitalPatientSettlementService.getAdmission(principal, admissionId)));
  }

  static DetailResponse toDetail(HospitalActivePatientDetailView view) {
    return new DetailResponse(
        view.kind().name(),
        view.admissionId(),
        view.uhid(),
        view.patientName(),
        view.wardName(),
        view.bedLabel(),
        view.locationLabel(),
        view.status() == null ? null : view.status().name(),
        view.admittedAt(),
        view.dischargedAt(),
        view.version(),
        view.unpaidPaise(),
        view.settledPaise(),
        view.billCount(),
        view.invoices().stream().map(HospitalActivePatientController::toInvoice).toList());
  }

  private static RowResponse toRow(HospitalActivePatientRow row) {
    return new RowResponse(
        row.kind().name(),
        row.admissionId(),
        row.uhid(),
        row.patientName(),
        row.wardName(),
        row.locationLabel(),
        row.unpaidPaise(),
        row.settledPaise(),
        row.billCount(),
        row.status() == null ? null : row.status().name(),
        row.version());
  }

  private static InvoiceResponse toInvoice(HospitalActivePatientInvoiceView invoice) {
    return new InvoiceResponse(
        invoice.id(),
        invoice.invoiceNumber(),
        invoice.completedAt(),
        invoice.saleSource(),
        invoice.itemCount(),
        invoice.paymentLabel(),
        invoice.status(),
        invoice.totalPaise(),
        invoice.amountDuePaise(),
        invoice.amountPaidPaise(),
        invoice.insurerName(),
        invoice.policyNumber());
  }

  public record ListResponse(List<RowResponse> items) {}

  @JsonInclude(JsonInclude.Include.NON_NULL)
  public record RowResponse(
      String kind,
      UUID admissionId,
      String uhid,
      String patientName,
      String wardName,
      String locationLabel,
      long unpaidPaise,
      long settledPaise,
      int billCount,
      String status,
      long version) {}

  @JsonInclude(JsonInclude.Include.NON_NULL)
  public record DetailResponse(
      String kind,
      UUID admissionId,
      String uhid,
      String patientName,
      String wardName,
      String bedLabel,
      String locationLabel,
      String status,
      Instant admittedAt,
      Instant dischargedAt,
      long version,
      long unpaidPaise,
      long settledPaise,
      int billCount,
      List<InvoiceResponse> invoices) {}

  @JsonInclude(JsonInclude.Include.NON_NULL)
  public record InvoiceResponse(
      UUID id,
      String invoiceNumber,
      Instant completedAt,
      String saleSource,
      int itemCount,
      String paymentLabel,
      String status,
      long totalPaise,
      long amountDuePaise,
      long amountPaidPaise,
      String insurerName,
      String policyNumber) {}
}
