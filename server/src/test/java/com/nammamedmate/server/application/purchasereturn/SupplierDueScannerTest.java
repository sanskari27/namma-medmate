package com.nammamedmate.server.application.purchasereturn;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.nammamedmate.server.application.notification.NotificationRoutingService;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class SupplierDueScannerTest {

  @Test
  void scanAllContinuesWhenOneTenantFails() {
    TenantRepository tenants = mock(TenantRepository.class);
    Tenant failed = new Tenant();
    failed.setId(UUID.randomUUID());
    Tenant ok = new Tenant();
    ok.setId(UUID.randomUUID());
    when(tenants.findAllByDeletedAtIsNullOrderByNameAsc()).thenReturn(List.of(failed, ok));

    SupplierDueScanner self = mock(SupplierDueScanner.class);
    when(self.scanTenant(failed.getId())).thenThrow(new RuntimeException("boom"));
    when(self.scanTenant(ok.getId())).thenReturn(1);

    SupplierDueScanner scanner =
        new SupplierDueScanner(
            tenants,
            mock(LocationRepository.class),
            mock(SupplierLedgerService.class),
            mock(NotificationRoutingService.class),
            Clock.fixed(Instant.parse("2026-09-18T00:00:00Z"), ZoneOffset.UTC),
            self);

    assertThat(scanner.scanAll()).isEqualTo(1);
    verify(self).scanTenant(ok.getId());
  }
}
