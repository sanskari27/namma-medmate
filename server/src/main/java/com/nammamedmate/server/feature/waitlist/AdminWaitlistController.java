package com.nammamedmate.server.feature.waitlist;

import com.nammamedmate.server.application.waitlist.WaitlistService;
import com.nammamedmate.server.application.waitlist.WaitlistSignupView;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.shared.web.ApiResponse;
import java.util.List;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/waitlist")
public class AdminWaitlistController {

  private final WaitlistService waitlistService;

  public AdminWaitlistController(WaitlistService waitlistService) {
    this.waitlistService = waitlistService;
  }

  @GetMapping
  public ApiResponse<WaitlistListResponse> list(Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(new WaitlistListResponse(waitlistService.list(principal)));
  }

  public record WaitlistListResponse(List<WaitlistSignupView> items) {}
}
