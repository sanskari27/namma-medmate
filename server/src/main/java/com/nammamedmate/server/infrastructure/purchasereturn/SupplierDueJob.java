package com.nammamedmate.server.infrastructure.purchasereturn;

import com.nammamedmate.server.application.purchasereturn.SupplierDueScanner;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class SupplierDueJob {

  private final SupplierDueScanner supplierDueScanner;

  public SupplierDueJob(SupplierDueScanner supplierDueScanner) {
    this.supplierDueScanner = supplierDueScanner;
  }

  @Scheduled(cron = "0 25 0 * * *", zone = "UTC")
  public void scanDaily() {
    supplierDueScanner.scanAll();
  }
}
