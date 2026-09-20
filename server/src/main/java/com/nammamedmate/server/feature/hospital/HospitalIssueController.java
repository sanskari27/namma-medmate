package com.nammamedmate.server.feature.hospital;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.nammamedmate.server.application.hospital.HospitalIssueCommand;
import com.nammamedmate.server.application.hospital.HospitalIssueListView;
import com.nammamedmate.server.application.hospital.HospitalIssuePdfBytes;
import com.nammamedmate.server.application.hospital.HospitalIssueService;
import com.nammamedmate.server.application.hospital.HospitalIssueView;
import com.nammamedmate.server.domain.HospitalPolicy;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.shared.web.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/hospital/issues")
public class HospitalIssueController {

  private final HospitalIssueService hospitalIssueService;

  public HospitalIssueController(HospitalIssueService hospitalIssueService) {
    this.hospitalIssueService = hospitalIssueService;
  }

  @GetMapping
  public ApiResponse<ListResponse> list(
      Authentication authentication,
      @RequestParam(required = false) UUID wardId,
      @RequestParam(required = false) String kind,
      @RequestParam(required = false) String q) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toResponse(
            hospitalIssueService.list(principal, wardId, HospitalPolicy.parseIssueKind(kind), q)));
  }

  @GetMapping("/{issueId}")
  public ApiResponse<IssueResponse> get(Authentication authentication, @PathVariable UUID issueId) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toResponse(hospitalIssueService.getById(principal, issueId)));
  }

  @GetMapping(value = "/{issueId}/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
  public ResponseEntity<byte[]> pdf(Authentication authentication, @PathVariable UUID issueId) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    HospitalIssuePdfBytes pdf = hospitalIssueService.pdf(principal, issueId);
    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + pdf.filename() + "\"")
        .contentType(MediaType.APPLICATION_PDF)
        .body(pdf.content());
  }

  @PostMapping
  public ApiResponse<IssueResponse> create(
      Authentication authentication, @Valid @RequestBody CreateIssueRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toResponse(
            hospitalIssueService.create(
                principal,
                new HospitalIssueCommand(
                    request.wardId(),
                    request.indentId(),
                    request.reason(),
                    request.uhid(),
                    request.patientName(),
                    request.idempotencyKey(),
                    request.lines().stream()
                        .map(
                            line ->
                                new HospitalIssueCommand.Line(
                                    line.productId(), line.batchId(), line.quantity()))
                        .toList()))));
  }

  private static ListResponse toResponse(HospitalIssueListView view) {
    return new ListResponse(
        view.items().stream().map(HospitalIssueController::toResponse).toList());
  }

  private static IssueResponse toResponse(HospitalIssueView view) {
    return new IssueResponse(
        view.id(),
        view.invoiceNumber(),
        view.wardId(),
        view.wardName(),
        view.indentId(),
        view.indentNumber(),
        view.reason() == null ? null : view.reason().name(),
        view.uhid(),
        view.patientName(),
        view.pharmacyGstin(),
        view.hospitalGstin(),
        view.creditTerms() == null ? null : view.creditTerms().name(),
        view.mrpValuePaise(),
        view.billedPaise(),
        view.issuedAt(),
        view.version(),
        view.lines().stream()
            .map(
                line ->
                    new LineResponse(
                        line.id(),
                        line.productId(),
                        line.productName(),
                        line.sku(),
                        line.batchId(),
                        line.batchNumber(),
                        line.expiryOn(),
                        line.hsnCode(),
                        line.gstRate(),
                        line.quantity(),
                        line.mrpPaise(),
                        line.creditPricePaise(),
                        line.discountBps(),
                        line.amountPaise()))
            .toList());
  }

  public record ListResponse(List<IssueResponse> items) {}

  public record CreateIssueRequest(
      @NotNull UUID wardId,
      UUID indentId,
      @NotBlank @Size(max = 32) String reason,
      @Size(max = 32) String uhid,
      @Size(max = 200) String patientName,
      @NotBlank @Size(max = 80) String idempotencyKey,
      @NotEmpty List<LineRequest> lines) {}

  public record LineRequest(
      @NotNull UUID productId, @NotNull UUID batchId, @NotNull BigDecimal quantity) {}

  @JsonInclude(JsonInclude.Include.NON_NULL)
  public record IssueResponse(
      UUID id,
      String invoiceNumber,
      UUID wardId,
      String wardName,
      UUID indentId,
      String indentNumber,
      String reason,
      String uhid,
      String patientName,
      String pharmacyGstin,
      String hospitalGstin,
      String creditTerms,
      long mrpValuePaise,
      long billedPaise,
      Instant issuedAt,
      long version,
      List<LineResponse> lines) {}

  public record LineResponse(
      UUID id,
      UUID productId,
      String productName,
      String sku,
      UUID batchId,
      String batchNumber,
      LocalDate expiryOn,
      String hsnCode,
      BigDecimal gstRate,
      BigDecimal quantity,
      long mrpPaise,
      long creditPricePaise,
      int discountBps,
      long amountPaise) {}
}
