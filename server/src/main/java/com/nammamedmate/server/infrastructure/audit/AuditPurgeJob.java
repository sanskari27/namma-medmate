package com.nammamedmate.server.infrastructure.audit;

import com.nammamedmate.server.application.audit.AuditService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class AuditPurgeJob {

  private final AuditService auditService;

  public AuditPurgeJob(AuditService auditService) {
    this.auditService = auditService;
  }

  @Scheduled(cron = "0 30 0 * * *", zone = "UTC")
  public void purgeDaily() {
    auditService.purgeExpired();
  }
}
