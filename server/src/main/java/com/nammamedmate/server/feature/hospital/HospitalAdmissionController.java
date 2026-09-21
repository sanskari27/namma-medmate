package com.nammamedmate.server.feature.hospital;

import com.nammamedmate.server.application.hospital.HospitalAdmissionCommand;
import com.nammamedmate.server.application.hospital.HospitalAdmissionService;
import com.nammamedmate.server.application.hospital.HospitalAdmissionView;
import com.nammamedmate.server.application.hospital.HospitalPatientSettleCommand;
import com.nammamedmate.server.application.hospital.HospitalPatientSettlementService;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.shared.web.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
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
@RequestMapping("/api/v1/hospital/admissions")
public class HospitalAdmissionController {

  private final HospitalAdmissionService hospitalAdmissionService;
  private final HospitalPatientSettlementService hospitalPatientSettlementService;

  public HospitalAdmissionController(
      HospitalAdmissionService hospitalAdmissionService,
      HospitalPatientSettlementService hospitalPatientSettlementService) {
    this.hospitalAdmissionService = hospitalAdmissionService;
    this.hospitalPatientSettlementService = hospitalPatientSettlementService;
  }

  @GetMapping("/next-uhid")
  public ApiResponse<NextUhidResponse> nextUhid(Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        new NextUhidResponse(hospitalAdmissionService.suggestNextUhid(principal)));
  }

  @GetMapping
  public ApiResponse<ListResponse> list(
      Authentication authentication, @RequestParam(required = false) String uhid) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    if (uhid != null && !uhid.isBlank()) {
      return ApiResponse.ok(
          new ListResponse(
              List.of(toResponse(hospitalAdmissionService.getByUhid(principal, uhid.trim())))));
    }
    List<AdmissionResponse> items =
        hospitalAdmissionService.listActive(principal).stream()
            .map(HospitalAdmissionController::toResponse)
            .toList();
    return ApiResponse.ok(new ListResponse(items));
  }

  @GetMapping("/{admissionId}")
  public ApiResponse<AdmissionResponse> get(
      Authentication authentication, @PathVariable UUID admissionId) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toResponse(hospitalAdmissionService.getById(principal, admissionId)));
  }

  @PostMapping
  public ApiResponse<AdmissionResponse> admit(
      Authentication authentication, @Valid @RequestBody AdmitRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toResponse(
            hospitalAdmissionService.admit(
                principal,
                new HospitalAdmissionCommand(
                    request.patientName(),
                    request.uhid(),
                    request.wardId(),
                    request.bedId(),
                    request.phone(),
                    request.age(),
                    request.gender(),
                    request.attendingDoctorId(),
                    request.diagnosis(),
                    request.payerType(),
                    request.insurerName(),
                    request.policyNumber()))));
  }

  @PostMapping("/casualty/settle")
  public ApiResponse<HospitalActivePatientController.DetailResponse> settleCasualty(
      Authentication authentication, @Valid @RequestBody CasualtySettleRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        HospitalActivePatientController.toDetail(
            hospitalPatientSettlementService.settleCasualty(
                principal,
                new HospitalPatientSettleCommand(
                    null,
                    request.paymentMode(),
                    request.idempotencyKey(),
                    request.insurerName(),
                    request.policyNumber(),
                    request.uhid()))));
  }

  @PostMapping("/{admissionId}/settle")
  public ApiResponse<HospitalActivePatientController.DetailResponse> settle(
      Authentication authentication,
      @PathVariable UUID admissionId,
      @Valid @RequestBody SettleRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        HospitalActivePatientController.toDetail(
            hospitalPatientSettlementService.settleAdmission(
                principal,
                admissionId,
                new HospitalPatientSettleCommand(
                    request.expectedVersion(),
                    request.paymentMode(),
                    request.idempotencyKey(),
                    request.insurerName(),
                    request.policyNumber(),
                    null))));
  }

  @PostMapping("/{admissionId}/discharge")
  public ApiResponse<HospitalActivePatientController.DetailResponse> discharge(
      Authentication authentication,
      @PathVariable UUID admissionId,
      @Valid @RequestBody DischargeRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        HospitalActivePatientController.toDetail(
            hospitalPatientSettlementService.discharge(
                principal,
                admissionId,
                new HospitalPatientSettleCommand(
                    request.expectedVersion(),
                    request.paymentMode(),
                    request.idempotencyKey(),
                    request.insurerName(),
                    request.policyNumber(),
                    null))));
  }

  private static AdmissionResponse toResponse(HospitalAdmissionView view) {
    return new AdmissionResponse(
        view.id(),
        view.uhid(),
        view.patientName(),
        view.phone(),
        view.age(),
        view.gender(),
        view.customerId(),
        view.wardId(),
        view.wardName(),
        view.bedId(),
        view.bedLabel(),
        view.attendingDoctorId(),
        view.attendingDoctorName(),
        view.diagnosis(),
        view.payerType().name(),
        view.insurerName(),
        view.policyNumber(),
        view.status().name(),
        view.admittedAt(),
        view.version());
  }

  public record NextUhidResponse(String nextUhid) {}

  public record ListResponse(List<AdmissionResponse> items) {}

  public record AdmitRequest(
      @NotBlank @Size(max = 200) String patientName,
      @NotBlank @Size(max = 32) String uhid,
      @NotNull UUID wardId,
      @NotNull UUID bedId,
      @Size(max = 32) String phone,
      Integer age,
      @Size(max = 32) String gender,
      UUID attendingDoctorId,
      @Size(max = 500) String diagnosis,
      @NotBlank String payerType,
      @Size(max = 200) String insurerName,
      @Size(max = 64) String policyNumber) {}

  public record SettleRequest(
      @NotNull Long expectedVersion,
      @NotBlank @Size(max = 16) String paymentMode,
      @NotBlank @Size(max = 128) String idempotencyKey,
      @Size(max = 200) String insurerName,
      @Size(max = 64) String policyNumber) {}

  public record CasualtySettleRequest(
      @NotBlank @Size(max = 32) String uhid,
      @NotBlank @Size(max = 16) String paymentMode,
      @NotBlank @Size(max = 128) String idempotencyKey,
      @Size(max = 200) String insurerName,
      @Size(max = 64) String policyNumber) {}

  public record DischargeRequest(
      @NotNull Long expectedVersion,
      @Size(max = 16) String paymentMode,
      @NotBlank @Size(max = 128) String idempotencyKey,
      @Size(max = 200) String insurerName,
      @Size(max = 64) String policyNumber) {}

  public record AdmissionResponse(
      UUID id,
      String uhid,
      String patientName,
      String phone,
      Integer age,
      String gender,
      UUID customerId,
      UUID wardId,
      String wardName,
      UUID bedId,
      String bedLabel,
      UUID attendingDoctorId,
      String attendingDoctorName,
      String diagnosis,
      String payerType,
      String insurerName,
      String policyNumber,
      String status,
      Instant admittedAt,
      long version) {}
}
