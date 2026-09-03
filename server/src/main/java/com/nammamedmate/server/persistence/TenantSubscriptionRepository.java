package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.TenantSubscription;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TenantSubscriptionRepository extends JpaRepository<TenantSubscription, UUID> {

  Optional<TenantSubscription> findByTenantId(UUID tenantId);

  boolean existsByTenantId(UUID tenantId);
}
