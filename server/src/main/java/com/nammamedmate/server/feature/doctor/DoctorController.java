package com.nammamedmate.server.feature.doctor;

import com.nammamedmate.server.application.doctor.DoctorService;
import com.nammamedmate.server.application.doctor.DoctorView;
import com.nammamedmate.server.application.doctor.TopReferringDoctorView;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.shared.web.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/doctors")
public class DoctorController {

  private final DoctorService doctorService;

  public DoctorController(DoctorService doctorService) {
    this.doctorService = doctorService;
  }

  @GetMapping
  public ApiResponse<DoctorListResponse> list(Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        new DoctorListResponse(
            doctorService.list(principal).stream().map(this::toResponse).toList()));
  }

  @GetMapping("/top-referring")
  public ApiResponse<TopReferringListResponse> topReferring(
      Authentication authentication, @RequestParam(defaultValue = "10") int limit) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        new TopReferringListResponse(
            doctorService.topReferring(principal, limit).stream()
                .map(this::toTopResponse)
                .toList()));
  }

  @GetMapping("/{id}")
  public ApiResponse<DoctorResponse> get(Authentication authentication, @PathVariable UUID id) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toResponse(doctorService.get(principal, id)));
  }

  @PostMapping
  public ApiResponse<DoctorResponse> create(
      Authentication authentication, @Valid @RequestBody UpsertDoctorRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toResponse(
            doctorService.create(
                principal,
                request.name(),
                request.registrationNumber(),
                request.phone(),
                request.notes())));
  }

  @PatchMapping("/{id}")
  public ApiResponse<DoctorResponse> update(
      Authentication authentication,
      @PathVariable UUID id,
      @Valid @RequestBody UpsertDoctorRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toResponse(
            doctorService.update(
                principal,
                id,
                request.name(),
                request.registrationNumber(),
                request.phone(),
                request.notes())));
  }

  @DeleteMapping("/{id}")
  public ApiResponse<DoctorResponse> deactivate(
      Authentication authentication, @PathVariable UUID id) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toResponse(doctorService.deactivate(principal, id)));
  }

  private DoctorResponse toResponse(DoctorView view) {
    return new DoctorResponse(
        view.id(),
        view.tenantId(),
        view.name(),
        view.registrationNumber(),
        view.phone(),
        view.notes(),
        view.createdAt(),
        view.updatedAt());
  }

  private TopReferringResponse toTopResponse(TopReferringDoctorView view) {
    return new TopReferringResponse(
        view.id(), view.name(), view.registrationNumber(), view.referralCount());
  }

  public record DoctorListResponse(List<DoctorResponse> items) {}

  public record TopReferringListResponse(List<TopReferringResponse> items) {}

  public record DoctorResponse(
      UUID id,
      UUID tenantId,
      String name,
      String registrationNumber,
      String phone,
      String notes,
      Instant createdAt,
      Instant updatedAt) {}

  public record TopReferringResponse(
      UUID id, String name, String registrationNumber, long referralCount) {}

  public record UpsertDoctorRequest(
      @NotBlank @Size(max = 200) String name,
      @Size(max = 64) String registrationNumber,
      @Size(max = 32) String phone,
      String notes) {}
}
