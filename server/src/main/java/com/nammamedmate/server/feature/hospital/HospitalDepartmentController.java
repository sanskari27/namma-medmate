package com.nammamedmate.server.feature.hospital;

import com.nammamedmate.server.application.hospital.HospitalDepartmentCommand;
import com.nammamedmate.server.application.hospital.HospitalDepartmentService;
import com.nammamedmate.server.application.hospital.HospitalDepartmentView;
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
@RequestMapping("/api/v1/hospital/departments")
public class HospitalDepartmentController {

  private final HospitalDepartmentService hospitalDepartmentService;

  public HospitalDepartmentController(HospitalDepartmentService hospitalDepartmentService) {
    this.hospitalDepartmentService = hospitalDepartmentService;
  }

  @GetMapping
  public ApiResponse<ListResponse> list(Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    List<DepartmentResponse> items =
        hospitalDepartmentService.list(principal).stream()
            .map(HospitalDepartmentController::toResponse)
            .toList();
    return ApiResponse.ok(new ListResponse(items));
  }

  @PostMapping
  public ApiResponse<DepartmentResponse> create(
      Authentication authentication, @Valid @RequestBody DepartmentRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toResponse(hospitalDepartmentService.create(principal, toCommand(request))));
  }

  @PutMapping("/{departmentId}")
  public ApiResponse<DepartmentResponse> update(
      Authentication authentication,
      @PathVariable UUID departmentId,
      @Valid @RequestBody DepartmentRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toResponse(hospitalDepartmentService.update(principal, departmentId, toCommand(request))));
  }

  private static HospitalDepartmentCommand toCommand(DepartmentRequest request) {
    return new HospitalDepartmentCommand(
        request.name(), request.type(), request.headDoctorId(), request.expectedVersion());
  }

  private static DepartmentResponse toResponse(HospitalDepartmentView view) {
    return new DepartmentResponse(
        view.id(),
        view.name(),
        view.type().name(),
        view.headDoctorId(),
        view.headDoctorName(),
        view.version());
  }

  public record DepartmentRequest(
      @NotBlank @Size(max = 200) String name,
      @NotBlank String type,
      UUID headDoctorId,
      Long expectedVersion) {}

  public record ListResponse(List<DepartmentResponse> items) {}

  public record DepartmentResponse(
      UUID id, String name, String type, UUID headDoctorId, String headDoctorName, long version) {}
}
