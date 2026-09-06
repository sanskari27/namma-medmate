package com.nammamedmate.server.infrastructure.communications;

import com.nammamedmate.server.application.communications.RefillDueScanner;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class RefillDueJob {

  private final RefillDueScanner refillDueScanner;

  public RefillDueJob(RefillDueScanner refillDueScanner) {
    this.refillDueScanner = refillDueScanner;
  }

  @Scheduled(cron = "0 25 0 * * *", zone = "UTC")
  public void scanDaily() {
    refillDueScanner.scanAll();
  }
}
