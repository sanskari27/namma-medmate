package com.nammamedmate.server.application.auth;

import com.nammamedmate.server.shared.exception.ApiException;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

@Component
public class AuthIpThrottle {

  static final String RATE_LIMITED_CODE = "RATE_LIMITED";
  static final String RATE_LIMITED_MESSAGE = "Too many attempts. Try again in a minute.";

  private final ConcurrentHashMap<String, List<Instant>> hits = new ConcurrentHashMap<>();
  private final Clock clock;
  private final int limit;
  private final Duration window;

  public AuthIpThrottle(Clock clock, @Value("${app.auth.ip-throttle-limit:20}") int limit) {
    this.clock = clock;
    this.limit = Math.max(1, limit);
    this.window = Duration.ofMinutes(1);
  }

  public void check(HttpServletRequest request) {
    check(clientIp(request));
  }

  public void check(String ip) {
    String key = ip == null || ip.isBlank() ? "unknown" : ip.trim();
    Instant now = Instant.now(clock);
    Instant cutoff = now.minus(window);
    List<Instant> stamped =
        hits.compute(
            key,
            (ignored, existing) -> {
              List<Instant> next = existing == null ? new ArrayList<>() : existing;
              Iterator<Instant> it = next.iterator();
              while (it.hasNext()) {
                if (it.next().isBefore(cutoff)) {
                  it.remove();
                }
              }
              next.add(now);
              return next;
            });
    if (stamped.size() > limit) {
      throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, RATE_LIMITED_CODE, RATE_LIMITED_MESSAGE);
    }
  }

  static String clientIp(HttpServletRequest request) {
    if (request == null) {
      return "unknown";
    }
    String forwarded = request.getHeader("X-Forwarded-For");
    if (forwarded != null && !forwarded.isBlank()) {
      return forwarded.split(",")[0].trim();
    }
    String remote = request.getRemoteAddr();
    return remote == null || remote.isBlank() ? "unknown" : remote;
  }
}
