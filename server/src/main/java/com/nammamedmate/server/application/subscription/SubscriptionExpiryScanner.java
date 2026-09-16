package com.nammamedmate.server.application.subscription;

import com.nammamedmate.server.domain.SubscriptionStatus;
import com.nammamedmate.server.domain.TenantSubscription;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.persistence.TenantSubscriptionRepository;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SubscriptionExpiryScanner {

  private final TenantSubscriptionRepository tenantSubscriptionRepository;
  private final TenantRepository tenantRepository;
  private final Clock clock;

  public SubscriptionExpiryScanner(
      TenantSubscriptionRepository tenantSubscriptionRepository,
      TenantRepository tenantRepository,
      Clock clock) {
    this.tenantSubscriptionRepository = tenantSubscriptionRepository;
    this.tenantRepository = tenantRepository;
    this.clock = clock;
  }

  @Transactional
  public int expireDue() {
    Instant now = Instant.now(clock);
    List<TenantSubscription> due =
        tenantSubscriptionRepository.findByStatusAndExpiresAtLessThanEqual(
            SubscriptionStatus.ACTIVE, now);
    for (TenantSubscription subscription : due) {
      subscription.setStatus(SubscriptionStatus.EXPIRED);
      subscription.setUpdatedAt(now);
      tenantSubscriptionRepository.save(subscription);
      tenantRepository
          .lockById(subscription.getTenantId())
          .filter(tenant -> tenant.getDeletedAt() == null)
          .ifPresent(
              tenant -> {
                SubscriptionService.expireActiveTenant(tenant, now);
                tenantRepository.save(tenant);
              });
    }
    return due.size();
  }
}
