package com.nammamedmate.server.infrastructure.inventory;

import com.nammamedmate.server.application.inventory.ItemExpiryScanner;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class ItemExpiryJob {

  private final ItemExpiryScanner itemExpiryScanner;

  public ItemExpiryJob(ItemExpiryScanner itemExpiryScanner) {
    this.itemExpiryScanner = itemExpiryScanner;
  }

  @Scheduled(cron = "0 20 0 * * *", zone = "UTC")
  public void scanDaily() {
    itemExpiryScanner.scanAll();
  }
}
