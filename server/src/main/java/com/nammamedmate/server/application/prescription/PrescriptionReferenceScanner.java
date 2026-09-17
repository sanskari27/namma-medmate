package com.nammamedmate.server.application.prescription;

import com.nammamedmate.server.domain.PrescriptionReference;
import com.nammamedmate.server.domain.PrescriptionReferenceStatus;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.PrescriptionReferenceRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PrescriptionReferenceScanner {

  private final PrescriptionReferenceRepository referenceRepository;
  private final TenantRepository tenantRepository;
  private final PrescriptionReferenceService referenceService;
  private final PrescriptionReferenceScanner self;

  public PrescriptionReferenceScanner(
      PrescriptionReferenceRepository referenceRepository,
      TenantRepository tenantRepository,
      PrescriptionReferenceService referenceService,
      @Lazy PrescriptionReferenceScanner self) {
    this.referenceRepository = referenceRepository;
    this.tenantRepository = tenantRepository;
    this.referenceService = referenceService;
    this.self = self;
  }

  public int scanAll() {
    int count = 0;
    for (Tenant tenant : tenantRepository.findAllByDeletedAtIsNullOrderByNameAsc()) {
      try {
        count += self.scanTenant(tenant.getId(), null);
      } catch (RuntimeException ignored) {
        // one tenant must not roll back the rest
      }
    }
    return count;
  }

  @Transactional(propagation = Propagation.REQUIRES_NEW)
  public int scanTenant(UUID tenantId, AuthPrincipal actor) {
    List<UUID> ids =
        referenceRepository
            .findByTenantIdAndStatusOrderByIssuedAtDesc(
                tenantId, PrescriptionReferenceStatus.ACTIVE)
            .stream()
            .map(PrescriptionReference::getId)
            .toList();
    int count = 0;
    for (UUID id : ids) {
      if (referenceService.archiveDue(tenantId, id, actor)) {
        count++;
      }
    }
    return count;
  }
}
