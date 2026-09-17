package com.nammamedmate.server.application.communications;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.WhatsAppMessage;
import com.nammamedmate.server.persistence.CustomerRefillScheduleRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class RefillDueScannerTest {

  @Test
  void scanAllContinuesWhenOneTenantFails() {
    TenantRepository tenants = mock(TenantRepository.class);
    Tenant failed = new Tenant();
    failed.setId(UUID.randomUUID());
    Tenant ok = new Tenant();
    ok.setId(UUID.randomUUID());
    when(tenants.findAllByDeletedAtIsNullOrderByNameAsc()).thenReturn(List.of(failed, ok));

    RefillDueScanner self = mock(RefillDueScanner.class);
    when(self.scanTenant(failed.getId())).thenThrow(new RuntimeException("boom"));
    WhatsAppMessage kept = new WhatsAppMessage();
    when(self.scanTenant(ok.getId())).thenReturn(List.of(kept));

    RefillDueScanner scanner =
        new RefillDueScanner(
            tenants,
            mock(CustomerRefillScheduleRepository.class),
            mock(WhatsAppMessageService.class),
            Clock.fixed(Instant.parse("2026-09-18T00:00:00Z"), ZoneOffset.UTC),
            self);

    assertThat(scanner.scanAll()).containsExactly(kept);
    verify(self).scanTenant(ok.getId());
  }
}
