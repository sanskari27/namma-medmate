package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.SavedLogin;
import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SavedLoginRepository extends JpaRepository<SavedLogin, UUID> {

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query(
      """
      select s from SavedLogin s
      where s.deviceId = :deviceId
        and s.userId = :userId
      """)
  Optional<SavedLogin> lockByDeviceIdAndUserId(
      @Param("deviceId") UUID deviceId, @Param("userId") UUID userId);

  @Query(
      """
      select u from AppUser u, SavedLogin s
      where s.deviceId = :deviceId
        and s.userId = u.id
        and s.revokedAt is null
        and s.expiresAt > :now
        and u.deletedAt is null
        and u.status = com.nammamedmate.server.domain.UserAccountStatus.ACTIVE
        and u.pinHash is not null
        and ((s.tenantId is null and u.tenantId is null) or s.tenantId = u.tenantId)
      order by u.displayName asc, u.email asc
      """)
  List<AppUser> findActiveUsersOnDevice(
      @Param("deviceId") UUID deviceId, @Param("now") Instant now);

  @Modifying(clearAutomatically = true, flushAutomatically = true)
  @Query(
      """
      update SavedLogin s
      set s.revokedAt = :now
      where s.userId = :userId
        and s.revokedAt is null
      """)
  int revokeActiveForUser(@Param("userId") UUID userId, @Param("now") Instant now);
}
