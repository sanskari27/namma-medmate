package com.nammamedmate.server.feature.hospital;

import com.nammamedmate.server.application.hospital.HospitalBedView;
import com.nammamedmate.server.application.hospital.HospitalWardCommand;
import com.nammamedmate.server.application.hospital.HospitalWardOccupancyView;
import com.nammamedmate.server.application.hospital.HospitalWardService;
import com.nammamedmate.server.application.hospital.HospitalWardView;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.shared.web.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
@RequestMapping("/api/v1/hospital/wards")
public class HospitalWardController {

  private final HospitalWardService hospitalWardService;

  public HospitalWardController(HospitalWardService hospitalWardService) {
    this.hospitalWardService = hospitalWardService;
  }

  @GetMapping
  public ApiResponse<OccupancyResponse> list(Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toResponse(hospitalWardService.list(principal)));
  }

  @PostMapping
  public ApiResponse<WardResponse> create(
      Authentication authentication, @Valid @RequestBody WardRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toWardResponse(hospitalWardService.create(principal, toCommand(request))));
  }

  @PutMapping("/{wardId}")
  public ApiResponse<WardResponse> update(
      Authentication authentication,
      @PathVariable UUID wardId,
      @Valid @RequestBody WardRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toWardResponse(hospitalWardService.update(principal, wardId, toCommand(request))));
  }

  private static HospitalWardCommand toCommand(WardRequest request) {
    return new HospitalWardCommand(
        request.name(),
        request.code(),
        request.floor(),
        request.category(),
        request.capacity(),
        request.nurseInCharge(),
        request.expectedVersion());
  }

  private static OccupancyResponse toResponse(HospitalWardOccupancyView view) {
    return new OccupancyResponse(
        view.wardCount(),
        view.totalBeds(),
        view.occupiedBeds(),
        view.freeBeds(),
        view.occupancyPercent(),
        view.admittedCount(),
        view.wards().stream().map(HospitalWardController::toWardResponse).toList());
  }

  private static WardResponse toWardResponse(HospitalWardView view) {
    return new WardResponse(
        view.id(),
        view.name(),
        view.code(),
        view.floor(),
        view.category().name(),
        view.capacity(),
        view.nurseInCharge(),
        view.version(),
        view.beds().stream().map(HospitalWardController::toBedResponse).toList());
  }

  private static BedResponse toBedResponse(HospitalBedView view) {
    return new BedResponse(
        view.id(), view.sequenceNo(), view.label(), view.occupancyStatus(), view.version());
  }

  public record WardRequest(
      @NotBlank @Size(max = 200) String name,
      @NotBlank @Size(max = 32) String code,
      @Size(max = 64) String floor,
      @NotBlank String category,
      @NotNull Integer capacity,
      @Size(max = 200) String nurseInCharge,
      Long expectedVersion) {}

  public record OccupancyResponse(
      int wardCount,
      int totalBeds,
      int occupiedBeds,
      int freeBeds,
      int occupancyPercent,
      int admittedCount,
      List<WardResponse> wards) {}

  public record WardResponse(
      UUID id,
      String name,
      String code,
      String floor,
      String category,
      int capacity,
      String nurseInCharge,
      long version,
      List<BedResponse> beds) {}

  public record BedResponse(
      UUID id, int sequenceNo, String label, String occupancyStatus, long version) {}
}
