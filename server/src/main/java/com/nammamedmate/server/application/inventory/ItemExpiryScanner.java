package com.nammamedmate.server.application.inventory;

import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import java.util.UUID;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ItemExpiryScanner {

  private final TenantRepository tenantRepository;
  private final LocationRepository locationRepository;
  private final InventoryStockService inventoryStockService;
  private final ItemExpiryScanner self;

  public ItemExpiryScanner(
      TenantRepository tenantRepository,
      LocationRepository locationRepository,
      InventoryStockService inventoryStockService,
      @Lazy ItemExpiryScanner self) {
    this.tenantRepository = tenantRepository;
    this.locationRepository = locationRepository;
    this.inventoryStockService = inventoryStockService;
    this.self = self;
  }

  public int scanAll() {
    int notified = 0;
    for (Tenant tenant : tenantRepository.findAllByDeletedAtIsNullOrderByNameAsc()) {
      try {
        notified += self.scanTenant(tenant.getId());
      } catch (RuntimeException ignored) {
        // one tenant must not roll back the rest
      }
    }
    return notified;
  }

  @Transactional(propagation = Propagation.REQUIRES_NEW)
  public int scanTenant(UUID tenantId) {
    int notified = 0;
    for (Location branch :
        locationRepository.findAllByTenantIdAndDeletedAtIsNullOrderByBranchCodeAsc(tenantId)) {
      notified += inventoryStockService.notifyNearExpiry(tenantId, branch.getId());
    }
    return notified;
  }
}
