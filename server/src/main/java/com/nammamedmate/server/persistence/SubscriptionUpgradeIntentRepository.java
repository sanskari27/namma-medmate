package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.SubscriptionUpgradeIntent;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SubscriptionUpgradeIntentRepository
    extends JpaRepository<SubscriptionUpgradeIntent, UUID> {

  Optional<SubscriptionUpgradeIntent> findByIdempotencyKey(String idempotencyKey);
}
