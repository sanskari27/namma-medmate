package com.nammamedmate.server.application.communications;

import com.nammamedmate.server.application.notification.NotificationRoutingService;
import com.nammamedmate.server.application.notification.RouteCommand;
import com.nammamedmate.server.domain.CustomerCreditAccount;
import com.nammamedmate.server.domain.NotificationTrigger;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.WhatsAppMessage;
import com.nammamedmate.server.persistence.CustomerCreditAccountRepository;
import com.nammamedmate.server.persistence.NotificationEventRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import java.time.Clock;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CreditDueScanner {

  private final TenantRepository tenantRepository;
  private final CustomerCreditAccountRepository creditAccountRepository;
  private final WhatsAppMessageService whatsAppMessageService;
  private final NotificationRoutingService notificationRoutingService;
  private final NotificationEventRepository notificationEventRepository;
  private final Clock clock;
  private final CreditDueScanner self;

  public CreditDueScanner(
      TenantRepository tenantRepository,
      CustomerCreditAccountRepository creditAccountRepository,
      WhatsAppMessageService whatsAppMessageService,
      NotificationRoutingService notificationRoutingService,
      NotificationEventRepository notificationEventRepository,
      Clock clock,
      @Lazy CreditDueScanner self) {
    this.tenantRepository = tenantRepository;
    this.creditAccountRepository = creditAccountRepository;
    this.whatsAppMessageService = whatsAppMessageService;
    this.notificationRoutingService = notificationRoutingService;
    this.notificationEventRepository = notificationEventRepository;
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
    List<WhatsAppMessage> out = new ArrayList<>();
    List<CustomerCreditAccount> due =
        creditAccountRepository.findAllByTenantIdAndBalancePaiseGreaterThanOrderByBalancePaiseDesc(
            tenantId, 0);
    for (CustomerCreditAccount account : due) {
      out.addAll(whatsAppMessageService.enqueueCredit(tenantId, account));
      notificationRoutingService.route(
          new RouteCommand(
              "credit-due:" + account.getId(),
              NotificationTrigger.CREDIT_DUE,
              tenantId,
              null,
              account.getCustomerId(),
              null,
              null,
              account.getCustomerId()));
    }
    return out;
  }

  public void releaseIfSettled(CustomerCreditAccount account) {
    if (account == null || account.getBalancePaise() > 0) {
      return;
    }
    notificationEventRepository
        .findByEventKey("credit-due:" + account.getId())
        .ifPresent(
            event -> {
              event.setEventKey("cleared:" + event.getId());
              notificationEventRepository.save(event);
            });
    whatsAppMessageService.releaseCredit(account.getTenantId(), account.getId());
  }
}
