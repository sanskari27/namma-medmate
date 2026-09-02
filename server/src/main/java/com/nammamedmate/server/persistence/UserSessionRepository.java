package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.UserSession;
import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserSessionRepository extends JpaRepository<UserSession, UUID> {

  @Modifying(clearAutomatically = true, flushAutomatically = true)
  @Query(
      "update UserSession s set s.revokedAt = :now where s.userId = :userId and s.revokedAt is null")
  int revokeActiveSessions(@Param("userId") UUID userId, @Param("now") Instant now);

  @Query(
      """
      select s from UserSession s
      where s.id = :id
        and s.revokedAt is null
        and s.userId = :userId
        and ((:tenantId is null and s.tenantId is null) or s.tenantId = :tenantId)
      """)
  Optional<UserSession> findActiveScopedSession(
      @Param("id") UUID id, @Param("userId") UUID userId, @Param("tenantId") UUID tenantId);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query(
      """
      select s from UserSession s
      where s.id = :id
        and s.revokedAt is null
        and s.userId = :userId
        and ((:tenantId is null and s.tenantId is null) or s.tenantId = :tenantId)
      """)
  Optional<UserSession> lockActiveScopedSession(
      @Param("id") UUID id, @Param("userId") UUID userId, @Param("tenantId") UUID tenantId);
}
