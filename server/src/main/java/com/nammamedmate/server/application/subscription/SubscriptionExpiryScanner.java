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
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SubscriptionExpiryScanner {

  private final TenantSubscriptionRepository tenantSubscriptionRepository;
  private final TenantRepository tenantRepository;
  private final NotificationRoutingService notificationRoutingService;
  private final Clock clock;

  public SubscriptionExpiryScanner(
      TenantSubscriptionRepository tenantSubscriptionRepository,
      TenantRepository tenantRepository,
      NotificationRoutingService notificationRoutingService,
      Clock clock) {
    this.tenantSubscriptionRepository = tenantSubscriptionRepository;
    this.tenantRepository = tenantRepository;
    this.notificationRoutingService = notificationRoutingService;
    this.clock = clock;
  }

  @Transactional
  public int expireDue() {
    Instant now = Instant.now(clock);
    LocalDate today = LocalDate.ofInstant(now, ZoneOffset.UTC);
    List<TenantSubscription> due =
        tenantSubscriptionRepository.findByStatusAndExpiresAtLessThanEqual(
            SubscriptionStatus.ACTIVE, now);
    for (TenantSubscription subscription : due) {
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
    }
    return due.size();
  }
}
