package com.nammamedmate.server.feature.hospital;

import com.nammamedmate.server.application.hospital.HospitalIndentCommand;
import com.nammamedmate.server.application.hospital.HospitalIndentListView;
import com.nammamedmate.server.application.hospital.HospitalIndentService;
import com.nammamedmate.server.application.hospital.HospitalIndentView;
import com.nammamedmate.server.domain.HospitalIndentStatus;
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
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/hospital/indents")
public class HospitalIndentController {

  private final HospitalIndentService hospitalIndentService;

  public HospitalIndentController(HospitalIndentService hospitalIndentService) {
    this.hospitalIndentService = hospitalIndentService;
  }

  @GetMapping
  public ApiResponse<ListResponse> list(
      Authentication authentication, @RequestParam(required = false) String status) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    HospitalIndentStatus filter =
        status == null || status.isBlank() ? null : HospitalPolicy.parseIndentStatus(status);
    return ApiResponse.ok(toResponse(hospitalIndentService.list(principal, filter)));
  }

  @GetMapping("/{indentId}")
  public ApiResponse<IndentResponse> get(
      Authentication authentication, @PathVariable UUID indentId) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toResponse(hospitalIndentService.getById(principal, indentId)));
  }

  @PostMapping
  public ApiResponse<IndentResponse> create(
      Authentication authentication, @Valid @RequestBody CreateIndentRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toResponse(
            hospitalIndentService.create(
                principal,
                new HospitalIndentCommand(
                    request.wardId(),
                    request.bedId(),
                    request.patientName(),
                    request.note(),
                    request.requestedBy(),
                    request.lines().stream()
                        .map(
                            line ->
                                new HospitalIndentCommand.Line(line.productId(), line.quantity()))
                        .toList()))));
  }

  @PostMapping("/{indentId}/approve")
  public ApiResponse<IndentResponse> approve(
      Authentication authentication, @PathVariable UUID indentId) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toResponse(hospitalIndentService.approve(principal, indentId)));
  }

  @PostMapping("/{indentId}/reject")
  public ApiResponse<IndentResponse> reject(
      Authentication authentication, @PathVariable UUID indentId) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toResponse(hospitalIndentService.reject(principal, indentId)));
  }

  private static ListResponse toResponse(HospitalIndentListView view) {
    return new ListResponse(
        view.pendingCount(),
        view.approvedCount(),
        view.issuedTodayCount(),
        view.totalCount(),
        view.items().stream().map(HospitalIndentController::toResponse).toList());
  }

  private static IndentResponse toResponse(HospitalIndentView view) {
    return new IndentResponse(
        view.id(),
        view.indentNumber(),
        view.wardId(),
        view.wardName(),
        view.bedId(),
        view.bedLabel(),
        view.patientName(),
        view.note(),
        view.requestedBy(),
        view.requestedAt(),
        view.status().name(),
        view.hospitalInvoiceRef(),
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
                        line.requestedQty(),
                        line.issuedQty()))
            .toList());
  }

  public record ListResponse(
      long pendingCount,
      long approvedCount,
      long issuedTodayCount,
      long totalCount,
      List<IndentResponse> items) {}

  public record CreateIndentRequest(
      @NotNull UUID wardId,
      UUID bedId,
      @Size(max = 200) String patientName,
      @Size(max = 500) String note,
      @NotBlank @Size(max = 200) String requestedBy,
      @NotEmpty List<LineRequest> lines) {}

  public record LineRequest(@NotNull UUID productId, @NotNull BigDecimal quantity) {}

  public record IndentResponse(
      UUID id,
      String indentNumber,
      UUID wardId,
      String wardName,
      UUID bedId,
      String bedLabel,
      String patientName,
      String note,
      String requestedBy,
      Instant requestedAt,
      String status,
      String hospitalInvoiceRef,
      Instant issuedAt,
      long version,
      List<LineResponse> lines) {}

  public record LineResponse(
      UUID id,
      UUID productId,
      String productName,
      String sku,
      BigDecimal requestedQty,
      BigDecimal issuedQty) {}
}
