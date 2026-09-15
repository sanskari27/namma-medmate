package com.nammamedmate.server.application.auth;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.nammamedmate.server.shared.exception.ApiException;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;

class AuthIpThrottleTest {

  @Test
  void thirdHitInWindowIsRateLimited() {
    Clock clock = Clock.fixed(Instant.parse("2026-09-15T12:00:00Z"), ZoneOffset.UTC);
    AuthIpThrottle throttle = new AuthIpThrottle(clock, 2);
    throttle.check("203.0.113.9");
    throttle.check("203.0.113.9");
    assertThatThrownBy(() -> throttle.check("203.0.113.9"))
        .isInstanceOf(ApiException.class)
        .satisfies(
            ex -> {
              ApiException api = (ApiException) ex;
              org.assertj.core.api.Assertions.assertThat(api.getStatus())
                  .isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
              org.assertj.core.api.Assertions.assertThat(api.getCode()).isEqualTo("RATE_LIMITED");
            });
  }

  @Test
  void forwardedForUsesFirstHop() {
    MockHttpServletRequest request = new MockHttpServletRequest();
    request.addHeader("X-Forwarded-For", "203.0.113.10, 10.0.0.1");
    org.assertj.core.api.Assertions.assertThat(AuthIpThrottle.clientIp(request))
        .isEqualTo("203.0.113.10");
  }
}
