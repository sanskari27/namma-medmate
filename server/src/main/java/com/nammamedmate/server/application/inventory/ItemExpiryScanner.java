package com.nammamedmate.server.application.inventory;

import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ItemExpiryScanner {

  private final TenantRepository tenantRepository;
  private final LocationRepository locationRepository;
  private final InventoryStockService inventoryStockService;

  public ItemExpiryScanner(
      TenantRepository tenantRepository,
      LocationRepository locationRepository,
      InventoryStockService inventoryStockService) {
    this.tenantRepository = tenantRepository;
    this.locationRepository = locationRepository;
    this.inventoryStockService = inventoryStockService;
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
    int notified = 0;
    for (Location branch :
        locationRepository.findAllByTenantIdAndDeletedAtIsNullOrderByBranchCodeAsc(tenantId)) {
      notified += inventoryStockService.notifyNearExpiry(tenantId, branch.getId());
    }
    return notified;
  }
}
