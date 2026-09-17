package com.nammamedmate.server.application.compliance;

import com.nammamedmate.server.application.notification.NotificationRoutingService;
import com.nammamedmate.server.application.notification.RouteCommand;
import com.nammamedmate.server.domain.ComplianceLicense;
import com.nammamedmate.server.domain.ComplianceLicenseScope;
import com.nammamedmate.server.domain.LicensePolicy;
import com.nammamedmate.server.domain.NotificationTrigger;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.persistence.ComplianceLicenseRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LicenseDueScanner {

  private final ComplianceLicenseRepository licenseRepository;
  private final TenantRepository tenantRepository;
  private final NotificationRoutingService notificationRoutingService;
  private final Clock clock;
  private final LicenseDueScanner self;

  public LicenseDueScanner(
      ComplianceLicenseRepository licenseRepository,
      TenantRepository tenantRepository,
      NotificationRoutingService notificationRoutingService,
      Clock clock,
      @Lazy LicenseDueScanner self) {
    this.licenseRepository = licenseRepository;
    this.tenantRepository = tenantRepository;
    this.notificationRoutingService = notificationRoutingService;
    this.clock = clock;
    this.self = self;
  }

  public List<ComplianceLicense> scanAll() {
    List<ComplianceLicense> due = new ArrayList<>();
    for (Tenant tenant : tenantRepository.findAllByDeletedAtIsNullOrderByNameAsc()) {
      try {
        due.addAll(self.scanTenant(tenant.getId()));
      } catch (RuntimeException ignored) {
        // one tenant must not roll back the rest
      }
    }
    return due;
  }

  @Transactional(readOnly = true)
  public List<ComplianceLicense> listAllDue() {
    List<ComplianceLicense> due = new ArrayList<>();
    for (Tenant tenant : tenantRepository.findAllByDeletedAtIsNullOrderByNameAsc()) {
      due.addAll(listDue(tenant.getId()));
    }
    return due;
  }

  @Transactional(propagation = Propagation.REQUIRES_NEW)
  public List<ComplianceLicense> scanTenant(UUID tenantId) {
    LocalDate today = today();
    List<ComplianceLicense> due = listDue(tenantId);
    for (ComplianceLicense license : due) {
      notifyIfDue(license, today);
    }
    return due;
  }

  @Transactional(readOnly = true)
  public List<ComplianceLicense> listDue(UUID tenantId) {
    return licenseRepository.findByTenantIdAndExpiresOnLessThanEqualOrderByExpiresOnAsc(
        tenantId, LicensePolicy.dueCutoff(today()));
  }

  public void notifyIfDue(ComplianceLicense license) {
    notifyIfDue(license, today());
  }

  private void notifyIfDue(ComplianceLicense license, LocalDate today) {
    if (!LicensePolicy.isDue(license.getExpiresOn(), today)) {
      return;
    }
    boolean staff = license.getScope() == ComplianceLicenseScope.STAFF;
    notificationRoutingService.route(
        new RouteCommand(
            (staff ? "staff-license:" : "license:") + license.getId() + ":" + today,
            staff ? NotificationTrigger.STAFF_LICENSE : NotificationTrigger.LICENSE_EXPIRY,
            license.getTenantId(),
            license.getBranchId(),
            license.getId(),
            staff ? license.getStaffUserId() : null,
            null,
            null));
  }

  private LocalDate today() {
    return LocalDate.ofInstant(clock.instant(), ZoneOffset.UTC);
  }
}
