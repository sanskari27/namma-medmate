package com.nammamedmate.server.infrastructure.compliance;

import com.nammamedmate.server.application.compliance.LicenseDueScanner;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class LicenseDueJob {

  private final LicenseDueScanner licenseDueScanner;

  public LicenseDueJob(LicenseDueScanner licenseDueScanner) {
    this.licenseDueScanner = licenseDueScanner;
  }

  @Scheduled(cron = "0 15 0 * * *", zone = "UTC")
  public void scanDaily() {
    licenseDueScanner.scanAll();
  }
}
