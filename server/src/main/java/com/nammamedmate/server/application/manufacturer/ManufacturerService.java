package com.nammamedmate.server.application.manufacturer;

import com.nammamedmate.server.application.access.AccessQueryService;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.Manufacturer;
import com.nammamedmate.server.domain.ModuleCode;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.ManufacturerRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ManufacturerService {

  private final ManufacturerRepository manufacturerRepository;
  private final AppUserRepository appUserRepository;
  private final AccessQueryService accessQueryService;
  private final Clock clock;

  public ManufacturerService(
      ManufacturerRepository manufacturerRepository,
      AppUserRepository appUserRepository,
      AccessQueryService accessQueryService,
      Clock clock) {
    this.manufacturerRepository = manufacturerRepository;
    this.appUserRepository = appUserRepository;
    this.accessQueryService = accessQueryService;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public List<ManufacturerView> list(AuthPrincipal principal) {
    UUID tenantId = requireInventoryAccess(principal);
    return manufacturerRepository.findAllByTenantIdOrderByNameAsc(tenantId).stream()
        .map(ManufacturerService::toView)
        .toList();
  }

  @Transactional
  public ManufacturerView create(AuthPrincipal principal, String name) {
    UUID tenantId = requireInventoryAccess(principal);
    String normalized = requireName(name);
    manufacturerRepository
        .findByTenantIdAndNameIgnoreCase(tenantId, normalized)
        .ifPresent(
            existing -> {
              throw new ApiException(
                  HttpStatus.CONFLICT,
                  "MANUFACTURER_TAKEN",
                  "A manufacturer with this name already exists");
            });

    Instant now = clock.instant();
    Manufacturer manufacturer = new Manufacturer();
    manufacturer.setId(UUID.randomUUID());
    manufacturer.setTenantId(tenantId);
    manufacturer.setName(normalized);
    manufacturer.setCreatedAt(now);
    manufacturer.setUpdatedAt(now);
    return toView(manufacturerRepository.save(manufacturer));
  }

  private UUID requireInventoryAccess(AuthPrincipal principal) {
    if (principal == null || principal.tenantId() == null) {
      throw forbidden();
    }
    if (principal.role() != AppUserRole.pharmacy_owner
        && principal.role() != AppUserRole.pharmacy_staff) {
      throw forbidden();
    }
    AppUser user =
        appUserRepository
            .findById(principal.userId())
            .filter(row -> row.getDeletedAt() == null)
            .orElseThrow(ManufacturerService::forbidden);
    if (!accessQueryService.effectiveModules(user).contains(ModuleCode.INVENTORY)) {
      throw forbidden();
    }
    return principal.tenantId();
  }

  private static String requireName(String name) {
    if (name == null || name.isBlank()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
    String trimmed = name.trim();
    if (trimmed.length() > 200) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
    return trimmed;
  }

  private static ManufacturerView toView(Manufacturer manufacturer) {
    return new ManufacturerView(
        manufacturer.getId(),
        manufacturer.getTenantId(),
        manufacturer.getName(),
        manufacturer.getCreatedAt(),
        manufacturer.getUpdatedAt());
  }

  private static ApiException forbidden() {
    return new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Forbidden");
  }
}
