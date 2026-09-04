package com.nammamedmate.server.feature.manufacturer;

import com.nammamedmate.server.application.manufacturer.ManufacturerService;
import com.nammamedmate.server.application.manufacturer.ManufacturerView;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.shared.web.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/manufacturers")
public class ManufacturerController {

  private final ManufacturerService manufacturerService;

  public ManufacturerController(ManufacturerService manufacturerService) {
    this.manufacturerService = manufacturerService;
  }

  @GetMapping
  public ApiResponse<ManufacturerListResponse> list(Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        new ManufacturerListResponse(
            manufacturerService.list(principal).stream().map(this::toResponse).toList()));
  }

  @PostMapping
  public ApiResponse<ManufacturerResponse> create(
      Authentication authentication, @Valid @RequestBody CreateManufacturerRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toResponse(manufacturerService.create(principal, request.name())));
  }

  private ManufacturerResponse toResponse(ManufacturerView view) {
    return new ManufacturerResponse(
        view.id(), view.tenantId(), view.name(), view.createdAt(), view.updatedAt());
  }

  public record ManufacturerListResponse(List<ManufacturerResponse> items) {}

  public record ManufacturerResponse(
      UUID id, UUID tenantId, String name, Instant createdAt, Instant updatedAt) {}

  public record CreateManufacturerRequest(@NotBlank @Size(max = 200) String name) {}
}
