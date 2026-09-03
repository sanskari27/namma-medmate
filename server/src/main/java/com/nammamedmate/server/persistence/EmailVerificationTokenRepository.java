package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.EmailVerificationToken;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EmailVerificationTokenRepository
    extends JpaRepository<EmailVerificationToken, UUID> {

  @Query(
      """
      select t from EmailVerificationToken t
      where t.tokenHash = :tokenHash
      """)
  Optional<EmailVerificationToken> findByTokenHash(@Param("tokenHash") String tokenHash);

  long countByTenantId(UUID tenantId);
}
