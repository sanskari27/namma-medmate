package com.nammamedmate.server.infrastructure.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.PasswordPolicy;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.shared.web.ApiResponse;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Clock;
import java.time.Instant;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

public class PasswordChangeRequiredFilter extends OncePerRequestFilter {

  private final AppUserRepository appUserRepository;
  private final Clock clock;
  private final ObjectMapper objectMapper;

  public PasswordChangeRequiredFilter(
      AppUserRepository appUserRepository, Clock clock, ObjectMapper objectMapper) {
    this.appUserRepository = appUserRepository;
    this.clock = clock;
    this.objectMapper = objectMapper;
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
      throws ServletException, IOException {
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    if (authentication == null
        || !(authentication.getPrincipal() instanceof AuthPrincipal principal)) {
      filterChain.doFilter(request, response);
      return;
    }
    if (isAllowed(request)) {
      filterChain.doFilter(request, response);
      return;
    }
    AppUser user = appUserRepository.findById(principal.userId()).orElse(null);
    Instant now = Instant.now(clock);
    if (user != null
        && user.getDeletedAt() == null
        && PasswordPolicy.mustChange(
            user.isMustChangePassword(), user.getPasswordChangedAt(), now)) {
      response.setStatus(HttpStatus.UNPROCESSABLE_ENTITY.value());
      response.setContentType(MediaType.APPLICATION_JSON_VALUE);
      objectMapper.writeValue(
          response.getOutputStream(),
          ApiResponse.error(
              "PASSWORD_CHANGE_REQUIRED", "Password must be changed before continuing."));
      return;
    }
    filterChain.doFilter(request, response);
  }

  private static boolean isAllowed(HttpServletRequest request) {
    String path = request.getServletPath();
    if (path == null || path.isEmpty()) {
      path = request.getRequestURI();
    }
    String method = request.getMethod();
    if ("GET".equalsIgnoreCase(method) && "/api/v1/auth/me".equals(path)) {
      return true;
    }
    if ("POST".equalsIgnoreCase(method) && "/api/v1/auth/password".equals(path)) {
      return true;
    }
    return "POST".equalsIgnoreCase(method) && "/api/v1/auth/pin/unlock".equals(path);
  }
}
