package com.nammamedmate.server.feature.waitlist;

import com.nammamedmate.server.application.waitlist.WaitlistJoin;
import com.nammamedmate.server.application.waitlist.WaitlistService;
import com.nammamedmate.server.application.waitlist.WaitlistSignupView;
import com.nammamedmate.server.shared.web.ApiResponse;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/waitlist")
public class WaitlistController {

  private final WaitlistService waitlistService;

  public WaitlistController(WaitlistService waitlistService) {
    this.waitlistService = waitlistService;
  }

  @PostMapping
  public ApiResponse<WaitlistSignupView> join(@RequestBody WaitlistJoin body) {
    return ApiResponse.ok(waitlistService.join(body));
  }
}
