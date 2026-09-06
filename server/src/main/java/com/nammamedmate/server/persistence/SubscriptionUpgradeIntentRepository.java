package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.SubscriptionUpgradeIntent;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SubscriptionUpgradeIntentRepository
    extends JpaRepository<SubscriptionUpgradeIntent, UUID> {

  Optional<SubscriptionUpgradeIntent> findByIdempotencyKey(String idempotencyKey);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select i from SubscriptionUpgradeIntent i where i.id = :id and i.tenantId = :tenantId")
  Optional<SubscriptionUpgradeIntent> lockByIdAndTenantId(
      @Param("id") UUID id, @Param("tenantId") UUID tenantId);
}
