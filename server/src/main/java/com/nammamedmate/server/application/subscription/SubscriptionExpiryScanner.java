package com.nammamedmate.server.application.subscription;

import com.nammamedmate.server.application.notification.NotificationRoutingService;
import com.nammamedmate.server.application.notification.RouteCommand;
import com.nammamedmate.server.domain.NotificationTrigger;
import com.nammamedmate.server.domain.SubscriptionStatus;
import com.nammamedmate.server.domain.TenantSubscription;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.persistence.TenantSubscriptionRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.UUID;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SubscriptionExpiryScanner {

  private final TenantSubscriptionRepository tenantSubscriptionRepository;
  private final TenantRepository tenantRepository;
  private final NotificationRoutingService notificationRoutingService;
  private final Clock clock;
  private final SubscriptionExpiryScanner self;

  public SubscriptionExpiryScanner(
      TenantSubscriptionRepository tenantSubscriptionRepository,
      TenantRepository tenantRepository,
      NotificationRoutingService notificationRoutingService,
      Clock clock,
      @Lazy SubscriptionExpiryScanner self) {
    this.tenantSubscriptionRepository = tenantSubscriptionRepository;
    this.tenantRepository = tenantRepository;
    this.notificationRoutingService = notificationRoutingService;
    this.clock = clock;
    this.self = self;
  }

  public int expireDue() {
    Instant now = Instant.now(clock);
    int expired = 0;
    for (TenantSubscription subscription :
        tenantSubscriptionRepository.findByStatusAndExpiresAtLessThanEqual(
            SubscriptionStatus.ACTIVE, now)) {
      try {
        if (self.expireOne(subscription.getId(), now)) {
          expired++;
        }
      } catch (RuntimeException ignored) {
        // one subscription must not roll back the rest
      }
    }
    return expired;
  }

  @Transactional(propagation = Propagation.REQUIRES_NEW)
  public boolean expireOne(UUID subscriptionId, Instant now) {
    TenantSubscription subscription =
        tenantSubscriptionRepository.findById(subscriptionId).orElse(null);
    if (subscription == null || subscription.getStatus() != SubscriptionStatus.ACTIVE) {
      return false;
    }
    Instant expiresAt = subscription.getExpiresAt();
    if (expiresAt == null || expiresAt.isAfter(now)) {
      return false;
    }
    LocalDate today = LocalDate.ofInstant(now, ZoneOffset.UTC);
    notificationRoutingService.route(
        new RouteCommand(
            "subscription-expiry:" + subscription.getTenantId() + ":" + today,
            NotificationTrigger.SUBSCRIPTION_EXPIRY,
            subscription.getTenantId(),
            null,
            subscription.getTenantId(),
            null,
            null,
            null));
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
    return true;
  }
}
