package com.nammamedmate.server.infrastructure.prescription;

import com.nammamedmate.server.application.prescription.PrescriptionReferenceScanner;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class PrescriptionReferenceArchiveJob {

  private final PrescriptionReferenceScanner scanner;

  public PrescriptionReferenceArchiveJob(PrescriptionReferenceScanner scanner) {
    this.scanner = scanner;
  }

  @Scheduled(cron = "0 20 0 * * *", zone = "UTC")
  public void scanDaily() {
    scanner.scanAll();
  }
}
