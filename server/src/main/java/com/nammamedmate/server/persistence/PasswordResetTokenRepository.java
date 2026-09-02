package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.PasswordResetToken;
import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, UUID> {

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select t from PasswordResetToken t where t.tokenHash = :tokenHash")
  Optional<PasswordResetToken> lockByTokenHash(@Param("tokenHash") String tokenHash);

  @Modifying(clearAutomatically = true, flushAutomatically = true)
  @Query(
      """
      update PasswordResetToken t
      set t.consumedAt = :now
      where t.userId = :userId
        and t.consumedAt is null
      """)
  int consumeUnusedForUser(@Param("userId") UUID userId, @Param("now") Instant now);
}
