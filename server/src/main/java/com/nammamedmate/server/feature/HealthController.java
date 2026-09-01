package com.nammamedmate.server.feature;

import com.nammamedmate.server.application.HealthService;
import com.nammamedmate.server.application.HealthStatus;
import com.nammamedmate.server.shared.web.ApiResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class HealthController {

  private final HealthService healthService;

  public HealthController(HealthService healthService) {
    this.healthService = healthService;
  }

  @GetMapping("/health")
  public ApiResponse<HealthStatus> health() {
    return ApiResponse.ok(healthService.getHealth());
  }
}
