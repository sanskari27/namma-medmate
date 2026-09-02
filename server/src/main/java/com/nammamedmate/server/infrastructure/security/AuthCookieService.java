package com.nammamedmate.server.infrastructure.security;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.time.Duration;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

@Component
public class AuthCookieService {

  private final String cookieName;
  private final String deviceCookieName;
  private final boolean secure;
  private final long ttlMinutes;
  private final long deviceCookieDays;

  public AuthCookieService(
      @Value("${app.security.cookie-name:nmm_access}") String cookieName,
      @Value("${app.security.device-cookie-name:nmm_device}") String deviceCookieName,
      @Value("${app.security.secure-cookie:false}") boolean secure,
      @Value("${app.session.ttl-minutes:720}") long ttlMinutes,
      @Value("${app.security.device-cookie-days:365}") long deviceCookieDays) {
    this.cookieName = cookieName;
    this.deviceCookieName = deviceCookieName;
    this.secure = secure;
    this.ttlMinutes = ttlMinutes;
    this.deviceCookieDays = deviceCookieDays;
  }

  public String cookieName() {
    return cookieName;
  }

  public String deviceCookieName() {
    return deviceCookieName;
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

  public void clearAccessToken(HttpServletResponse response) {
    ResponseCookie cookie =
        ResponseCookie.from(cookieName, "")
            .httpOnly(true)
            .secure(secure)
            .path("/")
            .sameSite("Lax")
            .maxAge(Duration.ZERO)
            .build();
    response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
  }

  public UUID readDeviceId(HttpServletRequest request) {
    Cookie[] cookies = request.getCookies();
    if (cookies == null) {
      return null;
    }
    for (Cookie cookie : cookies) {
      if (!deviceCookieName.equals(cookie.getName())
          || cookie.getValue() == null
          || cookie.getValue().isBlank()) {
        continue;
      }
      try {
        return UUID.fromString(cookie.getValue());
      } catch (IllegalArgumentException ignored) {
        return null;
      }
    }
    return null;
  }

  public UUID ensureDeviceId(HttpServletRequest request, HttpServletResponse response) {
    UUID deviceId = readDeviceId(request);
    if (deviceId == null) {
      deviceId = UUID.randomUUID();
    }
    writeDeviceId(response, deviceId);
    return deviceId;
  }

  public void writeDeviceId(HttpServletResponse response, UUID deviceId) {
    ResponseCookie cookie =
        ResponseCookie.from(deviceCookieName, deviceId.toString())
            .httpOnly(true)
            .secure(secure)
            .path("/")
            .sameSite("Lax")
            .maxAge(Duration.ofDays(deviceCookieDays))
            .build();
    response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
  }
}
