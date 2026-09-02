package com.nammamedmate.server.infrastructure.security;

import com.nammamedmate.server.domain.AppUserRole;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class JwtService {

  private final SecretKey key;
  private final long accessTokenTtlMinutes;

  public JwtService(
      @Value("${app.jwt.secret}") String secret,
      @Value("${app.jwt.access-token-ttl-minutes:60}") long accessTokenTtlMinutes) {
    this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    this.accessTokenTtlMinutes = accessTokenTtlMinutes;
  }

  public long accessTokenTtlMinutes() {
    return accessTokenTtlMinutes;
  }

  public String createToken(
      UUID userId,
      UUID sessionId,
      UUID tenantId,
      AppUserRole role,
      Instant issuedAt,
      Instant expiresAt) {
    return createToken(userId, sessionId, tenantId, role, issuedAt, expiresAt, null);
  }

  public String createToken(
      UUID sessionUserId,
      UUID sessionId,
      UUID sessionTenantId,
      AppUserRole sessionRole,
      Instant issuedAt,
      Instant expiresAt,
      ActingIdentity acting) {
    var builder =
        Jwts.builder()
            .subject(sessionUserId.toString())
            .id(sessionId.toString())
            .claim("sid", sessionId.toString())
            .claim("role", sessionRole.name())
            .issuedAt(Date.from(issuedAt))
            .expiration(Date.from(expiresAt));
    if (sessionTenantId != null) {
      builder.claim("tenant_id", sessionTenantId.toString());
    }
    if (acting != null) {
      builder.claim("act_uid", acting.userId().toString());
      builder.claim("act_role", acting.role().name());
      if (acting.tenantId() != null) {
        builder.claim("act_tid", acting.tenantId().toString());
      }
    }
    return builder.signWith(key).compact();
  }

  public AuthPrincipal parse(String token) {
    return principalFrom(claims(token, false));
  }

  public AuthPrincipal parseAllowingExpired(String token) {
    return principalFrom(claims(token, true));
  }

  private Claims claims(String token, boolean allowExpired) {
    try {
      return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
    } catch (ExpiredJwtException ex) {
      if (!allowExpired) {
        throw ex;
      }
      return ex.getClaims();
    }
  }

  private static AuthPrincipal principalFrom(Claims claims) {
    UUID sessionUserId = UUID.fromString(claims.getSubject());
    UUID sessionId = UUID.fromString(claims.get("sid", String.class));
    String tenantRaw = claims.get("tenant_id", String.class);
    UUID sessionTenantId = tenantRaw == null ? null : UUID.fromString(tenantRaw);
    AppUserRole sessionRole = AppUserRole.valueOf(claims.get("role", String.class));

    String actUid = claims.get("act_uid", String.class);
    if (actUid == null || actUid.isBlank()) {
      return new AuthPrincipal(sessionUserId, sessionTenantId, sessionId, sessionRole);
    }

    UUID actingUserId = UUID.fromString(actUid);
    String actTid = claims.get("act_tid", String.class);
    UUID actingTenantId = actTid == null ? null : UUID.fromString(actTid);
    AppUserRole actingRole = AppUserRole.valueOf(claims.get("act_role", String.class));
    return new AuthPrincipal(
        actingUserId,
        actingTenantId,
        sessionId,
        actingRole,
        sessionUserId,
        sessionTenantId,
        sessionUserId);
  }

  public record ActingIdentity(UUID userId, UUID tenantId, AppUserRole role) {}
}
