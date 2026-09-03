package com.nammamedmate.server.infrastructure.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TenantStatus;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.shared.web.ApiResponse;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

public class TenantAccessFilter extends OncePerRequestFilter {

  static final String TENANT_LOCKED_CODE = "TENANT_LOCKED";
  static final String VERIFICATION_LOCKED_MESSAGE =
      "This pharmacy is locked until verification and KYC are complete.";
  static final String SUSPENDED_LOCKED_MESSAGE = "This pharmacy is suspended.";
  static final String EXPIRED_LOCKED_MESSAGE = "This pharmacy subscription has expired.";
  static final String TERMINATED_LOCKED_MESSAGE = "This pharmacy has been terminated.";

  private final TenantRepository tenantRepository;
  private final ObjectMapper objectMapper;

  public TenantAccessFilter(TenantRepository tenantRepository, ObjectMapper objectMapper) {
    this.tenantRepository = tenantRepository;
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
    if (principal.tenantId() == null || isSessionAllowlisted(request)) {
      filterChain.doFilter(request, response);
      return;
    }
    Tenant tenant = tenantRepository.findById(principal.tenantId()).orElse(null);
    if (tenant == null || tenant.getDeletedAt() != null) {
      filterChain.doFilter(request, response);
      return;
    }
    TenantStatus status = tenant.getStatus();
    if (status == TenantStatus.ACTIVE) {
      filterChain.doFilter(request, response);
      return;
    }
    if (status == TenantStatus.VERIFICATION_REQUIRED) {
      if (isKycAllowlisted(request)) {
        filterChain.doFilter(request, response);
        return;
      }
      writeLocked(response, VERIFICATION_LOCKED_MESSAGE);
      return;
    }
    if (status == TenantStatus.SUSPENDED
        || status == TenantStatus.EXPIRED
        || status == TenantStatus.TERMINATED) {
      writeLocked(response, lockedMessage(status));
      return;
    }
    filterChain.doFilter(request, response);
  }

  private void writeLocked(HttpServletResponse response, String message) throws IOException {
    response.setStatus(HttpStatus.FORBIDDEN.value());
    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
    objectMapper.writeValue(
        response.getOutputStream(), ApiResponse.error(TENANT_LOCKED_CODE, message));
  }

  private static String lockedMessage(TenantStatus status) {
    return switch (status) {
      case SUSPENDED -> SUSPENDED_LOCKED_MESSAGE;
      case EXPIRED -> EXPIRED_LOCKED_MESSAGE;
      case TERMINATED -> TERMINATED_LOCKED_MESSAGE;
      default -> VERIFICATION_LOCKED_MESSAGE;
    };
  }

  private static boolean isSessionAllowlisted(HttpServletRequest request) {
    String path = servletPath(request);
    String method = request.getMethod();
    if ("GET".equalsIgnoreCase(method) && "/api/v1/auth/me".equals(path)) {
      return true;
    }
    if ("POST".equalsIgnoreCase(method) && "/api/v1/auth/logout".equals(path)) {
      return true;
    }
    if ("POST".equalsIgnoreCase(method) && "/api/v1/auth/password".equals(path)) {
      return true;
    }
    if ("POST".equalsIgnoreCase(method) && "/api/v1/auth/pin".equals(path)) {
      return true;
    }
    if ("POST".equalsIgnoreCase(method) && "/api/v1/auth/pin/unlock".equals(path)) {
      return true;
    }
    return "DELETE".equalsIgnoreCase(method) && "/api/v1/admin/impersonation".equals(path);
  }

  private static boolean isKycAllowlisted(HttpServletRequest request) {
    String path = servletPath(request);
    String method = request.getMethod();
    return ("GET".equalsIgnoreCase(method) || "POST".equalsIgnoreCase(method))
        && path.matches("/api/v1/tenants/[^/]+/kyc");
  }

  private static String servletPath(HttpServletRequest request) {
    String path = request.getServletPath();
    if (path == null || path.isEmpty()) {
      return request.getRequestURI();
    }
    return path;
  }
}
