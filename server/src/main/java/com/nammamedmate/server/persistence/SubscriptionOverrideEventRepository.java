package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.SubscriptionOverrideEvent;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SubscriptionOverrideEventRepository
    extends JpaRepository<SubscriptionOverrideEvent, UUID> {

  List<SubscriptionOverrideEvent> findByTenantIdOrderByCreatedAtDesc(UUID tenantId);
}
