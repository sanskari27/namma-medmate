package com.nammamedmate.server.feature.analytics;

import com.nammamedmate.server.application.analytics.AnalyticsService;
import com.nammamedmate.server.application.analytics.AnalyticsView;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.shared.web.ApiResponse;
import java.time.LocalDate;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/analytics")
public class AnalyticsController {

  private final AnalyticsService analyticsService;

  public AnalyticsController(AnalyticsService analyticsService) {
    this.analyticsService = analyticsService;
  }

  @GetMapping
  public ApiResponse<AnalyticsView> open(
      Authentication authentication,
      @RequestParam(required = false) String compare,
      @RequestParam(required = false) LocalDate from,
      @RequestParam(required = false) LocalDate to,
      @RequestParam(required = false) LocalDate priorFrom,
      @RequestParam(required = false) LocalDate priorTo,
      @RequestParam(required = false) String branchId,
      @RequestParam(required = false) String scope,
      @RequestParam(required = false) Integer limit) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        analyticsService.open(
            principal, compare, from, to, priorFrom, priorTo, branchId, scope, limit));
  }
}
