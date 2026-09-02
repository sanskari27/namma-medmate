package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.TransactionalEmail;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TransactionalEmailRepository extends JpaRepository<TransactionalEmail, UUID> {

  Optional<TransactionalEmail> findByIdempotencyKey(String idempotencyKey);

  Optional<TransactionalEmail> findByProviderMessageId(String providerMessageId);

  @Query(
      """
      select e from TransactionalEmail e
      where e.id = :id
        and ((:tenantId is null and e.tenantId is null) or e.tenantId = :tenantId)
      """)
  Optional<TransactionalEmail> findByIdAndTenantId(
      @Param("id") UUID id, @Param("tenantId") UUID tenantId);
}
