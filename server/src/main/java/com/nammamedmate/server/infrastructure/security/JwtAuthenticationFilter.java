package com.nammamedmate.server.infrastructure.security;

import com.nammamedmate.server.application.branch.BranchAssignmentService;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.domain.UserSession;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.UserSessionRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.web.filter.OncePerRequestFilter;

public class JwtAuthenticationFilter extends OncePerRequestFilter {

  private final JwtService jwtService;
  private final AuthCookieService authCookieService;
  private final UserSessionRepository userSessionRepository;
  private final AppUserRepository appUserRepository;
  private final BranchAssignmentService branchAssignmentService;
  private final Clock clock;

  public JwtAuthenticationFilter(
      JwtService jwtService,
      AuthCookieService authCookieService,
      UserSessionRepository userSessionRepository,
      AppUserRepository appUserRepository,
      BranchAssignmentService branchAssignmentService,
      Clock clock) {
    this.jwtService = jwtService;
    this.authCookieService = authCookieService;
    this.userSessionRepository = userSessionRepository;
    this.appUserRepository = appUserRepository;
    this.branchAssignmentService = branchAssignmentService;
    this.clock = clock;
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
      throws ServletException, IOException {
    String token = resolveToken(request);
    if (token != null && SecurityContextHolder.getContext().getAuthentication() == null) {
      try {
        boolean pinUnlock = isPinUnlock(request);
        AuthPrincipal principal =
            pinUnlock ? jwtService.parseAllowingExpired(token) : jwtService.parse(token);
        UserSession session =
            userSessionRepository
                .findActiveScopedSession(
                    principal.sessionId(), principal.sessionUserId(), principal.sessionTenantId())
                .orElse(null);
        Instant now = Instant.now(clock);
        boolean sessionLive = session != null && session.getExpiresAt().isAfter(now);
        boolean actingEnded =
            principal.impersonating() && !isSupportEscape(request) && !actingUserActive(principal);
        if (sessionLive && !actingEnded) {
          UUID branchId = session.getActiveBranchId();
          if (branchId != null) {
            AppUser actor = appUserRepository.findById(principal.userId()).orElse(null);
            if (actor == null || !branchAssignmentService.canAccessBranch(actor, branchId)) {
              branchId = null;
            }
          }
          AuthPrincipal withBranch = principal.withActiveBranchId(branchId);
          UsernamePasswordAuthenticationToken authentication =
              new UsernamePasswordAuthenticationToken(
                  withBranch,
                  null,
                  List.of(new SimpleGrantedAuthority("ROLE_" + withBranch.role().name())));
          authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
          SecurityContextHolder.getContext().setAuthentication(authentication);
        }
      } catch (RuntimeException ignored) {
        SecurityContextHolder.clearContext();
      }
    }
    filterChain.doFilter(request, response);
  }

  private boolean actingUserActive(AuthPrincipal principal) {
    return appUserRepository
        .findById(principal.userId())
        .filter(user -> user.getDeletedAt() == null)
        .filter(user -> user.getStatus() == UserAccountStatus.ACTIVE)
        .isPresent();
  }

  private static boolean isSupportEscape(HttpServletRequest request) {
    String path = request.getServletPath();
    if (path == null || path.isEmpty()) {
      path = request.getRequestURI();
    }
    String method = request.getMethod();
    if ("DELETE".equalsIgnoreCase(method) && "/api/v1/admin/impersonation".equals(path)) {
      return true;
    }
    return "POST".equalsIgnoreCase(method) && "/api/v1/auth/logout".equals(path);
  }

  private static boolean isPinUnlock(HttpServletRequest request) {
    if (!"POST".equalsIgnoreCase(request.getMethod())) {
      return false;
    }
    String path = request.getServletPath();
    if (path == null || path.isEmpty()) {
      path = request.getRequestURI();
    }
    return "/api/v1/auth/pin/unlock".equals(path);
  }

  private String resolveToken(HttpServletRequest request) {
    Cookie[] cookies = request.getCookies();
    if (cookies != null) {
      for (Cookie cookie : cookies) {
        if (authCookieService.cookieName().equals(cookie.getName())
            && cookie.getValue() != null
            && !cookie.getValue().isBlank()) {
          return cookie.getValue();
        }
      }
    }
    String header = request.getHeader(HttpHeaders.AUTHORIZATION);
    if (header != null && header.startsWith("Bearer ")) {
      return header.substring("Bearer ".length()).trim();
    }
    return null;
  }
}
