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
    var builder =
        Jwts.builder()
            .subject(userId.toString())
            .id(sessionId.toString())
            .claim("sid", sessionId.toString())
            .claim("role", role.name())
            .issuedAt(Date.from(issuedAt))
            .expiration(Date.from(expiresAt));
    if (tenantId != null) {
      builder.claim("tenant_id", tenantId.toString());
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
    UUID userId = UUID.fromString(claims.getSubject());
    UUID sessionId = UUID.fromString(claims.get("sid", String.class));
    String tenantRaw = claims.get("tenant_id", String.class);
    UUID tenantId = tenantRaw == null ? null : UUID.fromString(tenantRaw);
    AppUserRole role = AppUserRole.valueOf(claims.get("role", String.class));
    return new AuthPrincipal(userId, tenantId, sessionId, role);
  }
}
