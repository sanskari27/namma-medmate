package com.nammamedmate.server.application.purchasereturn;

import com.nammamedmate.server.application.notification.NotificationRoutingService;
import com.nammamedmate.server.application.notification.RouteCommand;
import com.nammamedmate.server.domain.DashboardPolicy;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.NotificationTrigger;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import java.time.Clock;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SupplierDueScanner {

  private final TenantRepository tenantRepository;
  private final LocationRepository locationRepository;
  private final SupplierLedgerService supplierLedgerService;
  private final NotificationRoutingService notificationRoutingService;
  private final Clock clock;

  public SupplierDueScanner(
      TenantRepository tenantRepository,
      LocationRepository locationRepository,
      SupplierLedgerService supplierLedgerService,
      NotificationRoutingService notificationRoutingService,
      Clock clock) {
    this.tenantRepository = tenantRepository;
    this.locationRepository = locationRepository;
    this.supplierLedgerService = supplierLedgerService;
    this.notificationRoutingService = notificationRoutingService;
    this.clock = clock;
  }

  @Transactional
  public int scanAll() {
    int notified = 0;
    for (Tenant tenant : tenantRepository.findAllByDeletedAtIsNullOrderByNameAsc()) {
      notified += scanTenant(tenant.getId());
    }
    return notified;
  }

  @Transactional
  public int scanTenant(UUID tenantId) {
    LocalDate today = LocalDate.ofInstant(clock.instant(), DashboardPolicy.IST);
    int notified = 0;
    for (Location branch :
        locationRepository.findAllByTenantIdAndDeletedAtIsNullOrderByBranchCodeAsc(tenantId)) {
      SupplierDueListResult dues = supplierLedgerService.dues(tenantId, branch.getId(), today);
      for (SupplierDueListResult.DueItem item : dues.items()) {
        notificationRoutingService.route(
            new RouteCommand(
                "sd:"
                    + tenantId
                    + ":"
                    + branch.getId()
                    + ":"
                    + item.supplierId()
                    + ":"
                    + item.dueOn(),
                NotificationTrigger.SUPPLIER_DUE,
                tenantId,
                branch.getId(),
                item.supplierId(),
                null,
                null,
                null));
        notified++;
      }
    }
    return notified;
  }
}
