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
  static final String TENANT_LOCKED_MESSAGE =
      "This pharmacy is locked until verification and KYC are complete.";

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
    if (principal.tenantId() == null || isAllowed(request)) {
      filterChain.doFilter(request, response);
      return;
    }
    Tenant tenant = tenantRepository.findById(principal.tenantId()).orElse(null);
    if (tenant != null
        && tenant.getDeletedAt() == null
        && tenant.getStatus() == TenantStatus.VERIFICATION_REQUIRED) {
      response.setStatus(HttpStatus.FORBIDDEN.value());
      response.setContentType(MediaType.APPLICATION_JSON_VALUE);
      objectMapper.writeValue(
          response.getOutputStream(), ApiResponse.error(TENANT_LOCKED_CODE, TENANT_LOCKED_MESSAGE));
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
    if (("GET".equalsIgnoreCase(method) || "POST".equalsIgnoreCase(method))
        && path.matches("/api/v1/tenants/[^/]+/kyc")) {
      return true;
    }
    return "DELETE".equalsIgnoreCase(method) && "/api/v1/admin/impersonation".equals(path);
  }
}
