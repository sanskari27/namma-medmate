package com.nammamedmate.server.application.communications;

import com.nammamedmate.server.domain.CustomerRefillSchedule;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.WhatsAppMessage;
import com.nammamedmate.server.persistence.CustomerRefillScheduleRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RefillDueScanner {

  private final TenantRepository tenantRepository;
  private final CustomerRefillScheduleRepository refillRepository;
  private final WhatsAppMessageService whatsAppMessageService;
  private final Clock clock;

  public RefillDueScanner(
      TenantRepository tenantRepository,
      CustomerRefillScheduleRepository refillRepository,
      WhatsAppMessageService whatsAppMessageService,
      Clock clock) {
    this.tenantRepository = tenantRepository;
    this.refillRepository = refillRepository;
    this.whatsAppMessageService = whatsAppMessageService;
    this.clock = clock;
  }

  @Transactional
  public List<WhatsAppMessage> scanAll() {
    List<WhatsAppMessage> out = new ArrayList<>();
    for (Tenant tenant : tenantRepository.findAllByDeletedAtIsNullOrderByNameAsc()) {
      out.addAll(scanTenant(tenant.getId()));
    }
    return out;
  }

  @Transactional
  public List<WhatsAppMessage> scanTenant(UUID tenantId) {
    LocalDate today = LocalDate.ofInstant(clock.instant(), ZoneOffset.UTC);
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
