package com.nammamedmate.server.application.communications;

import com.nammamedmate.server.domain.CustomerRefillSchedule;
import com.nammamedmate.server.domain.DashboardPolicy;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.WhatsAppMessage;
import com.nammamedmate.server.persistence.CustomerRefillScheduleRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RefillDueScanner {

  private final TenantRepository tenantRepository;
  private final CustomerRefillScheduleRepository refillRepository;
  private final WhatsAppMessageService whatsAppMessageService;
  private final Clock clock;
  private final RefillDueScanner self;

  public RefillDueScanner(
      TenantRepository tenantRepository,
      CustomerRefillScheduleRepository refillRepository,
      WhatsAppMessageService whatsAppMessageService,
      Clock clock,
      @Lazy RefillDueScanner self) {
    this.tenantRepository = tenantRepository;
    this.refillRepository = refillRepository;
    this.whatsAppMessageService = whatsAppMessageService;
    this.clock = clock;
    this.self = self;
  }

  public List<WhatsAppMessage> scanAll() {
    List<WhatsAppMessage> out = new ArrayList<>();
    for (Tenant tenant : tenantRepository.findAllByDeletedAtIsNullOrderByNameAsc()) {
      try {
        out.addAll(self.scanTenant(tenant.getId()));
      } catch (RuntimeException ignored) {
        // one tenant must not roll back the rest
      }
    }
    return out;
  }

  @Transactional(propagation = Propagation.REQUIRES_NEW)
  public List<WhatsAppMessage> scanTenant(UUID tenantId) {
    LocalDate today = LocalDate.ofInstant(clock.instant(), DashboardPolicy.IST);
    List<WhatsAppMessage> out = new ArrayList<>();
    List<CustomerRefillSchedule> due =
        refillRepository.findAllByTenantIdAndNextDueOnLessThanEqualOrderByNextDueOnAsc(
            tenantId, today);
    for (CustomerRefillSchedule schedule : due) {
      out.addAll(whatsAppMessageService.enqueueRefill(tenantId, schedule));
    }
    return out;
  }
}
