package com.nammamedmate.server.application.communications;

import com.nammamedmate.server.application.notification.NotificationRoutingService;
import com.nammamedmate.server.application.notification.RouteCommand;
import com.nammamedmate.server.domain.CustomerCreditAccount;
import com.nammamedmate.server.domain.NotificationTrigger;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.WhatsAppMessage;
import com.nammamedmate.server.persistence.CustomerCreditAccountRepository;
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
public class CreditDueScanner {

  private final TenantRepository tenantRepository;
  private final CustomerCreditAccountRepository creditAccountRepository;
  private final WhatsAppMessageService whatsAppMessageService;
  private final NotificationRoutingService notificationRoutingService;
  private final Clock clock;

  public CreditDueScanner(
      TenantRepository tenantRepository,
      CustomerCreditAccountRepository creditAccountRepository,
      WhatsAppMessageService whatsAppMessageService,
      NotificationRoutingService notificationRoutingService,
      Clock clock) {
    this.tenantRepository = tenantRepository;
    this.creditAccountRepository = creditAccountRepository;
    this.whatsAppMessageService = whatsAppMessageService;
    this.notificationRoutingService = notificationRoutingService;
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
    List<CustomerCreditAccount> due =
        creditAccountRepository.findAllByTenantIdAndBalancePaiseGreaterThanOrderByBalancePaiseDesc(
            tenantId, 0);
    for (CustomerCreditAccount account : due) {
      out.addAll(whatsAppMessageService.enqueueCredit(tenantId, account));
      notificationRoutingService.route(
          new RouteCommand(
              "credit-due:" + account.getId() + ":" + today,
              NotificationTrigger.CREDIT_DUE,
              tenantId,
              null,
              account.getId(),
              null,
              null,
              account.getCustomerId()));
    }
    return out;
  }
}
