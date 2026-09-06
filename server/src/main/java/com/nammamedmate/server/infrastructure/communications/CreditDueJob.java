package com.nammamedmate.server.infrastructure.communications;

import com.nammamedmate.server.application.communications.CreditDueScanner;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class CreditDueJob {

  private final CreditDueScanner creditDueScanner;

  public CreditDueJob(CreditDueScanner creditDueScanner) {
    this.creditDueScanner = creditDueScanner;
  }

  @Scheduled(cron = "0 30 0 * * *", zone = "UTC")
  public void scanDaily() {
    creditDueScanner.scanAll();
  }
}
