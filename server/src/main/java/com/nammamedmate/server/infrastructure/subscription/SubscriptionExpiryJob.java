package com.nammamedmate.server.infrastructure.subscription;

import com.nammamedmate.server.application.subscription.SubscriptionExpiryScanner;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class SubscriptionExpiryJob {

  private final SubscriptionExpiryScanner subscriptionExpiryScanner;

  public SubscriptionExpiryJob(SubscriptionExpiryScanner subscriptionExpiryScanner) {
    this.subscriptionExpiryScanner = subscriptionExpiryScanner;
  }

  @Scheduled(cron = "0 5 0 * * *", zone = "UTC")
  public void scanDaily() {
    subscriptionExpiryScanner.expireDue();
  }
}
