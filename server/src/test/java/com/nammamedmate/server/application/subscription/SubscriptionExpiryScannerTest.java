package com.nammamedmate.server.application.subscription;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.nammamedmate.server.application.notification.NotificationRoutingService;
import com.nammamedmate.server.domain.SubscriptionStatus;
import com.nammamedmate.server.domain.TenantSubscription;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.persistence.TenantSubscriptionRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class SubscriptionExpiryScannerTest {

  @Test
  void expireDueContinuesWhenOneSubscriptionFails() {
    TenantSubscriptionRepository subscriptions = mock(TenantSubscriptionRepository.class);
    TenantSubscription failed = new TenantSubscription();
    failed.setId(UUID.randomUUID());
    TenantSubscription ok = new TenantSubscription();
    ok.setId(UUID.randomUUID());
    Clock clock = Clock.fixed(Instant.parse("2026-09-18T00:00:00Z"), ZoneOffset.UTC);
    Instant now = Instant.now(clock);
    when(subscriptions.findByStatusAndExpiresAtLessThanEqual(SubscriptionStatus.ACTIVE, now))
        .thenReturn(List.of(failed, ok));

    SubscriptionExpiryScanner self = mock(SubscriptionExpiryScanner.class);
    when(self.expireOne(failed.getId(), now)).thenThrow(new RuntimeException("boom"));
    when(self.expireOne(ok.getId(), now)).thenReturn(true);

    SubscriptionExpiryScanner scanner =
        new SubscriptionExpiryScanner(
            subscriptions,
            mock(TenantRepository.class),
            mock(NotificationRoutingService.class),
            clock,
            self);

    assertThat(scanner.expireDue()).isEqualTo(1);
    verify(self).expireOne(ok.getId(), now);
  }
}
