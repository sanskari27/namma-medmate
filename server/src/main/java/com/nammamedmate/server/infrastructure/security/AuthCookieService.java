package com.nammamedmate.server.infrastructure.security;

import jakarta.servlet.http.HttpServletResponse;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

@Component
public class AuthCookieService {

  private final String cookieName;
  private final boolean secure;
  private final long ttlMinutes;

  public AuthCookieService(
      @Value("${app.security.cookie-name:nmm_access}") String cookieName,
      @Value("${app.security.secure-cookie:false}") boolean secure,
      @Value("${app.jwt.access-token-ttl-minutes:60}") long ttlMinutes) {
    this.cookieName = cookieName;
    this.secure = secure;
    this.ttlMinutes = ttlMinutes;
  }

  public String cookieName() {
    return cookieName;
  }

  public void writeAccessToken(HttpServletResponse response, String token) {
    ResponseCookie cookie =
        ResponseCookie.from(cookieName, token)
            .httpOnly(true)
            .secure(secure)
            .path("/")
            .sameSite("Lax")
            .maxAge(Duration.ofMinutes(ttlMinutes))
            .build();
    response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
  }
}
