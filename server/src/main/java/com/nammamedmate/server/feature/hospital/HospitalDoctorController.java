package com.nammamedmate.server.feature.hospital;

import com.nammamedmate.server.application.hospital.HospitalDoctorCommand;
import com.nammamedmate.server.application.hospital.HospitalDoctorService;
import com.nammamedmate.server.application.hospital.HospitalDoctorView;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.shared.web.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/hospital/doctors")
public class HospitalDoctorController {

  private final HospitalDoctorService hospitalDoctorService;

  public HospitalDoctorController(HospitalDoctorService hospitalDoctorService) {
    this.hospitalDoctorService = hospitalDoctorService;
  }

  @GetMapping
  public ApiResponse<ListResponse> list(Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    List<DoctorResponse> items =
        hospitalDoctorService.list(principal).stream()
            .map(HospitalDoctorController::toResponse)
            .toList();
    return ApiResponse.ok(new ListResponse(items));
  }

  @PostMapping
  public ApiResponse<DoctorResponse> create(
      Authentication authentication, @Valid @RequestBody DoctorRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toResponse(hospitalDoctorService.create(principal, toCommand(request))));
  }

  @PutMapping("/{doctorId}")
  public ApiResponse<DoctorResponse> update(
      Authentication authentication,
      @PathVariable UUID doctorId,
      @Valid @RequestBody DoctorRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toResponse(hospitalDoctorService.update(principal, doctorId, toCommand(request))));
  }

  private static HospitalDoctorCommand toCommand(DoctorRequest request) {
    return new HospitalDoctorCommand(
        request.name(),
        request.registrationNumber(),
        request.phone(),
        request.departmentId(),
        request.qualification(),
        request.specialty(),
        request.gender(),
        request.experienceYears(),
        request.email(),
        request.opdRoom(),
        request.consultingDays(),
        request.consultingHours(),
        request.consultationFeePaise(),
        request.status(),
        request.languages(),
        request.notes(),
        request.expectedVersion());
  }

  private static DoctorResponse toResponse(HospitalDoctorView view) {
    return new DoctorResponse(
        view.id(),
        view.doctorId(),
        view.name(),
        view.registrationNumber(),
        view.phone(),
        view.departmentId(),
        view.departmentName(),
        view.qualification(),
        view.specialty(),
        view.gender(),
        view.experienceYears(),
        view.email(),
        view.opdRoom(),
        view.consultingDays(),
        view.consultingHours(),
        view.consultationFeePaise(),
        view.status().name(),
        view.languages(),
        view.notes(),
        view.version());
  }

  public record DoctorRequest(
      @NotBlank @Size(max = 200) String name,
      @Size(max = 64) String registrationNumber,
      @Size(max = 32) String phone,
      UUID departmentId,
      @Size(max = 200) String qualification,
      @Size(max = 200) String specialty,
      @Size(max = 32) String gender,
      Integer experienceYears,
      @Size(max = 320) String email,
      @Size(max = 64) String opdRoom,
      @Size(max = 200) String consultingDays,
      @Size(max = 200) String consultingHours,
      Long consultationFeePaise,
      @NotBlank String status,
      @Size(max = 500) String languages,
      String notes,
      Long expectedVersion) {}

  public record ListResponse(List<DoctorResponse> items) {}

  public record DoctorResponse(
      UUID id,
      UUID doctorId,
      String name,
      String registrationNumber,
      String phone,
      UUID departmentId,
      String departmentName,
      String qualification,
      String specialty,
      String gender,
      Integer experienceYears,
      String email,
      String opdRoom,
      String consultingDays,
      String consultingHours,
      long consultationFeePaise,
      String status,
      String languages,
      String notes,
      long version) {}
}
