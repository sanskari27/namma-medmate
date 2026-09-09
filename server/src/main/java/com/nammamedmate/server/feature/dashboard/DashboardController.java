package com.nammamedmate.server.feature.dashboard;

import com.nammamedmate.server.application.dashboard.DashboardService;
import com.nammamedmate.server.application.dashboard.DashboardView;
import com.nammamedmate.server.application.dashboard.HomeDashboardService;
import com.nammamedmate.server.application.dashboard.HomeDashboardView;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.shared.web.ApiResponse;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/dashboards")
public class DashboardController {

  private final DashboardService dashboardService;
  private final HomeDashboardService homeDashboardService;

  public DashboardController(
      DashboardService dashboardService, HomeDashboardService homeDashboardService) {
    this.dashboardService = dashboardService;
    this.homeDashboardService = homeDashboardService;
  }

  @GetMapping("/home")
  public ApiResponse<HomeDashboardView> home(
      Authentication authentication, @RequestParam(required = false) String period) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(homeDashboardService.open(principal, period));
  }

  @GetMapping("/{role}")
  public ApiResponse<DashboardView> open(
      Authentication authentication,
      @PathVariable String role,
      @RequestParam(required = false) String branchId,
      @RequestParam(required = false) String scope) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(dashboardService.open(principal, role, branchId, scope));
  }
}
