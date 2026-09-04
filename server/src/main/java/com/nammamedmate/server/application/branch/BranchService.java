package com.nammamedmate.server.application.branch;

import com.nammamedmate.server.application.subscription.SubscriptionService;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.BranchCodeGenerator;
import com.nammamedmate.server.domain.BranchSettingsSnapshot;
import com.nammamedmate.server.domain.BranchStatus;
import com.nammamedmate.server.domain.BranchType;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.OperatingHoursValidator;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BranchService {

  private final LocationRepository locationRepository;
  private final TenantRepository tenantRepository;
  private final AppUserRepository appUserRepository;
  private final BranchAssignmentService branchAssignmentService;
  private final SubscriptionService subscriptionService;
  private final Clock clock;

  public BranchService(
      LocationRepository locationRepository,
      TenantRepository tenantRepository,
      AppUserRepository appUserRepository,
      BranchAssignmentService branchAssignmentService,
      SubscriptionService subscriptionService,
      Clock clock) {
    this.locationRepository = locationRepository;
    this.tenantRepository = tenantRepository;
    this.appUserRepository = appUserRepository;
    this.branchAssignmentService = branchAssignmentService;
    this.subscriptionService = subscriptionService;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public List<BranchView> listForTenantUser(AuthPrincipal principal) {
    UUID tenantId = requireTenantUser(principal);
    if (principal.role() == AppUserRole.pharmacy_owner) {
      return locationRepository
          .findAllByTenantIdAndDeletedAtIsNullOrderByBranchCodeAsc(tenantId)
          .stream()
          .map(BranchService::toView)
          .toList();
    }
    if (principal.activeBranchId() != null) {
      branchAssignmentService.assertActiveBranchAllowed(principal);
    }
    AppUser user =
        appUserRepository
            .findById(principal.userId())
            .filter(row -> row.getDeletedAt() == null)
            .orElseThrow(BranchService::forbidden);
    return locationRepository
        .findAllByTenantIdAndDeletedAtIsNullOrderByBranchCodeAsc(tenantId)
        .stream()
        .filter(branch -> branchAssignmentService.canAccessBranch(user, branch.getId()))
        .map(BranchService::toView)
        .toList();
  }

  @Transactional(readOnly = true)
  public BranchView getForTenantUser(AuthPrincipal principal, UUID branchId) {
    UUID tenantId = requireTenantUser(principal);
    Location branch = requireBranch(branchId, tenantId);
    if (principal.role() != AppUserRole.pharmacy_owner) {
      if (principal.activeBranchId() != null) {
        branchAssignmentService.assertActiveBranchAllowed(principal);
      }
      branchAssignmentService.assertCanAccess(principal, branchId);
    }
    return toView(branch);
  }

  @Transactional(readOnly = true)
  public List<BranchView> listForOwner(AuthPrincipal principal) {
    return listForTenantUser(principal);
  }

  @Transactional(readOnly = true)
  public BranchView getForOwner(AuthPrincipal principal, UUID branchId) {
    return getForTenantUser(principal, branchId);
  }

  @Transactional(readOnly = true)
  public List<BranchView> listForAdmin(AuthPrincipal principal, UUID tenantId) {
    requireMaster(principal);
    if (tenantRepository.findById(tenantId).filter(t -> t.getDeletedAt() == null).isEmpty()) {
      throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Tenant not found");
    }
    return locationRepository
        .findAllByTenantIdAndDeletedAtIsNullOrderByBranchCodeAsc(tenantId)
        .stream()
        .map(BranchService::toView)
        .toList();
  }

  @Transactional
  public BranchView create(
      AuthPrincipal principal,
      String name,
      String addressLine,
      String city,
      String state,
      String pincode,
      String contactPhone,
      String contactEmail,
      String drugLicenseNumber,
      String gstin,
      Map<String, Object> operatingHours,
      BranchType branchType,
      BranchStatus status,
      LocalDate openingDate,
      boolean defaultBranch,
      boolean linkedWarehouse,
      Map<String, Object> pricingSettings,
      Map<String, Object> taxSettings) {
    UUID tenantId = requireOwnerTenant(principal);
    subscriptionService.assertCanAddBranch(tenantId);
    Instant now = Instant.now(clock);
    Location branch = new Location();
    branch.setId(UUID.randomUUID());
    branch.setTenantId(tenantId);
    applyWritableFields(
        branch,
        name,
        addressLine,
        city,
        state,
        pincode,
        contactPhone,
        contactEmail,
        drugLicenseNumber,
        gstin,
        operatingHours,
        branchType,
        status == null ? BranchStatus.ACTIVE : status,
        openingDate == null ? LocalDate.ofInstant(now, ZoneOffset.UTC) : openingDate,
        linkedWarehouse,
        pricingSettings,
        taxSettings);
    long existing = locationRepository.countByTenantIdAndDeletedAtIsNull(tenantId);
    branch.setBranchCode(BranchCodeGenerator.nextCode(existing));
    branch.setCreatedAt(now);
    branch.setUpdatedAt(now);
    if (defaultBranch || existing == 0) {
      promoteDefault(tenantId, branch, now);
    } else {
      branch.setDefaultBranch(false);
    }
    return toView(locationRepository.save(branch));
  }

  @Transactional
  public BranchView update(
      AuthPrincipal principal,
      UUID branchId,
      String name,
      String addressLine,
      String city,
      String state,
      String pincode,
      String contactPhone,
      String contactEmail,
      String drugLicenseNumber,
      String gstin,
      Map<String, Object> operatingHours,
      BranchType branchType,
      BranchStatus status,
      LocalDate openingDate,
      Boolean defaultBranch,
      Boolean linkedWarehouse,
      Map<String, Object> pricingSettings,
      Map<String, Object> taxSettings) {
    UUID tenantId = requireOwnerTenant(principal);
    Instant now = Instant.now(clock);
    Location branch =
        locationRepository.lockByIdAndTenantId(branchId, tenantId).orElseThrow(() -> notFound());
    applyWritableFields(
        branch,
        name != null ? name : branch.getName(),
        addressLine != null ? addressLine : branch.getAddressLine(),
        city != null ? city : branch.getCity(),
        state != null ? state : branch.getState(),
        pincode != null ? pincode : branch.getPincode(),
        contactPhone != null ? contactPhone : branch.getContactPhone(),
        contactEmail != null ? contactEmail : branch.getContactEmail(),
        drugLicenseNumber != null ? drugLicenseNumber : branch.getDrugLicenseNumber(),
        gstin != null ? gstin : branch.getGstin(),
        operatingHours != null ? operatingHours : branch.getOperatingHours(),
        branchType != null ? branchType : branch.getBranchType(),
        status != null ? status : branch.getStatus(),
        openingDate != null ? openingDate : branch.getOpeningDate(),
        linkedWarehouse != null ? linkedWarehouse : branch.isLinkedWarehouse(),
        pricingSettings != null ? pricingSettings : branch.getPricingSettings(),
        taxSettings != null ? taxSettings : branch.getTaxSettings());

    boolean makeDefault = defaultBranch != null && defaultBranch;
    boolean clearDefault = defaultBranch != null && !defaultBranch;
    if (clearDefault && branch.isDefaultBranch()) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          "DEFAULT_REQUIRED",
          "Exactly one active default branch is required");
    }
    if (branch.getStatus() == BranchStatus.INACTIVE && branch.isDefaultBranch() && !makeDefault) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          "DEFAULT_REQUIRED",
          "Cannot deactivate the default branch without assigning another default");
    }
    if (makeDefault) {
      promoteDefault(tenantId, branch, now);
    }
    branch.setUpdatedAt(now);
    return toView(locationRepository.save(branch));
  }

  @Transactional
  public BranchView copySettings(AuthPrincipal principal, UUID targetId, UUID sourceId) {
    UUID tenantId = requireOwnerTenant(principal);
    if (Objects.equals(targetId, sourceId)) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY, "VALIDATION_ERROR", "Source and target must differ");
    }
    Location target =
        locationRepository.lockByIdAndTenantId(targetId, tenantId).orElseThrow(() -> notFound());
    Location source = requireBranch(sourceId, tenantId);
    Instant now = Instant.now(clock);
    target.setPricingSettings(BranchSettingsSnapshot.copy(source.getPricingSettings()));
    target.setTaxSettings(BranchSettingsSnapshot.copy(source.getTaxSettings()));
    target.setInventorySettings(BranchSettingsSnapshot.copy(source.getInventorySettings()));
    target.setUpdatedAt(now);
    return toView(locationRepository.save(target));
  }

  @Transactional
  public Location createDefaultFromKyc(
      UUID tenantId,
      String legalName,
      String addressLine1,
      String city,
      String state,
      String pincode,
      String contactPhone,
      String drugLicenseNumber,
      String gstin) {
    if (locationRepository.existsByTenantIdAndDeletedAtIsNullAndDefaultBranchTrue(tenantId)) {
      return locationRepository.findDefaultByTenantId(tenantId).orElseThrow();
    }
    Instant now = Instant.now(clock);
    Location branch = new Location();
    branch.setId(UUID.randomUUID());
    branch.setTenantId(tenantId);
    branch.setName(required(legalName, "legalName") + " Main");
    branch.setBranchCode(
        BranchCodeGenerator.nextCode(
            locationRepository.countByTenantIdAndDeletedAtIsNull(tenantId)));
    branch.setAddressLine(required(addressLine1, "addressLine1"));
    branch.setCity(required(city, "city"));
    branch.setState(required(state, "state"));
    branch.setPincode(required(pincode, "pincode"));
    branch.setContactPhone(required(contactPhone, "contactPhone"));
    branch.setDrugLicenseNumber(required(drugLicenseNumber, "drugLicenseNumber"));
    branch.setGstin(blankToNull(gstin));
    branch.setOperatingHours(defaultHours());
    branch.setBranchType(BranchType.RETAIL);
    branch.setStatus(BranchStatus.ACTIVE);
    branch.setOpeningDate(LocalDate.ofInstant(now, ZoneOffset.UTC));
    branch.setDefaultBranch(true);
    branch.setLinkedWarehouse(false);
    branch.setPricingSettings(defaultPricing());
    branch.setTaxSettings(defaultTax(state));
    branch.setInventorySettings(defaultInventory());
    branch.setCreatedAt(now);
    branch.setUpdatedAt(now);
    return locationRepository.save(branch);
  }

  private void promoteDefault(UUID tenantId, Location branch, Instant now) {
    locationRepository
        .lockDefaultByTenantId(tenantId)
        .ifPresent(
            current -> {
              if (!Objects.equals(current.getId(), branch.getId())) {
                current.setDefaultBranch(false);
                current.setUpdatedAt(now);
                locationRepository.saveAndFlush(current);
              }
            });
    if (branch.getStatus() != BranchStatus.ACTIVE) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY, "DEFAULT_REQUIRED", "Default branch must be ACTIVE");
    }
    branch.setDefaultBranch(true);
  }

  private void applyWritableFields(
      Location branch,
      String name,
      String addressLine,
      String city,
      String state,
      String pincode,
      String contactPhone,
      String contactEmail,
      String drugLicenseNumber,
      String gstin,
      Map<String, Object> operatingHours,
      BranchType branchType,
      BranchStatus status,
      LocalDate openingDate,
      boolean linkedWarehouse,
      Map<String, Object> pricingSettings,
      Map<String, Object> taxSettings) {
    branch.setName(required(name, "name"));
    branch.setAddressLine(required(addressLine, "addressLine"));
    branch.setCity(required(city, "city"));
    branch.setState(required(state, "state"));
    branch.setPincode(required(pincode, "pincode"));
    branch.setContactPhone(required(contactPhone, "contactPhone"));
    branch.setContactEmail(blankToNull(contactEmail));
    branch.setDrugLicenseNumber(required(drugLicenseNumber, "drugLicenseNumber"));
    branch.setGstin(blankToNull(gstin));
    Map<String, Object> hours =
        operatingHours == null ? new LinkedHashMap<>() : new LinkedHashMap<>(operatingHours);
    if (!OperatingHoursValidator.isValid(hours)) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_HOURS", "Operating hours are invalid");
    }
    branch.setOperatingHours(hours);
    if (branchType == null) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
    // Kiosk classification does not authorize self-order; store type only.
    branch.setBranchType(branchType);
    branch.setStatus(status == null ? BranchStatus.ACTIVE : status);
    branch.setOpeningDate(openingDate);
    branch.setLinkedWarehouse(linkedWarehouse);
    branch.setPricingSettings(
        pricingSettings == null ? defaultPricing() : BranchSettingsSnapshot.copy(pricingSettings));
    branch.setTaxSettings(
        taxSettings == null ? defaultTax(state) : BranchSettingsSnapshot.copy(taxSettings));
    if (branch.getInventorySettings() == null || branch.getInventorySettings().isEmpty()) {
      branch.setInventorySettings(defaultInventory());
    }
  }

  private Location requireBranch(UUID branchId, UUID tenantId) {
    return locationRepository
        .findByIdAndTenantIdAndDeletedAtIsNull(branchId, tenantId)
        .orElseThrow(() -> notFound());
  }

  private UUID requireOwnerTenant(AuthPrincipal principal) {
    if (principal == null
        || principal.role() != AppUserRole.pharmacy_owner
        || principal.tenantId() == null) {
      throw forbidden();
    }
    return principal.tenantId();
  }

  private UUID requireTenantUser(AuthPrincipal principal) {
    if (principal == null
        || principal.tenantId() == null
        || (principal.role() != AppUserRole.pharmacy_owner
            && principal.role() != AppUserRole.pharmacy_staff)) {
      throw forbidden();
    }
    return principal.tenantId();
  }

  private void requireMaster(AuthPrincipal principal) {
    if (principal == null || principal.role() != AppUserRole.admin_super) {
      throw forbidden();
    }
  }

  private static BranchView toView(Location branch) {
    return new BranchView(
        branch.getId(),
        branch.getTenantId(),
        branch.getName(),
        branch.getBranchCode(),
        branch.getAddressLine(),
        branch.getCity(),
        branch.getState(),
        branch.getPincode(),
        branch.getContactPhone(),
        branch.getContactEmail(),
        branch.getDrugLicenseNumber(),
        branch.getGstin(),
        BranchSettingsSnapshot.copy(branch.getOperatingHours()),
        branch.getBranchType(),
        branch.getStatus(),
        branch.getOpeningDate(),
        branch.isDefaultBranch(),
        branch.isLinkedWarehouse(),
        BranchSettingsSnapshot.copy(branch.getPricingSettings()),
        BranchSettingsSnapshot.copy(branch.getTaxSettings()),
        branch.getCreatedAt(),
        branch.getUpdatedAt());
  }

  private static Map<String, Object> defaultHours() {
    Map<String, Object> hours = new LinkedHashMap<>();
    for (String day : List.of("mon", "tue", "wed", "thu", "fri", "sat")) {
      Map<String, Object> slot = new LinkedHashMap<>();
      slot.put("open", "09:00");
      slot.put("close", "21:00");
      hours.put(day, slot);
    }
    Map<String, Object> sunday = new LinkedHashMap<>();
    sunday.put("closed", true);
    hours.put("sun", sunday);
    return hours;
  }

  private static Map<String, Object> defaultPricing() {
    Map<String, Object> pricing = new LinkedHashMap<>();
    pricing.put("defaultMarkupBps", 0);
    pricing.put("roundToNearestPaise", 1);
    return pricing;
  }

  private static Map<String, Object> defaultTax(String state) {
    Map<String, Object> tax = new LinkedHashMap<>();
    tax.put("gstMode", "CGST_SGST");
    tax.put("defaultGstRateBps", 1200);
    tax.put("taxState", state == null ? "" : state);
    return tax;
  }

  private static Map<String, Object> defaultInventory() {
    Map<String, Object> inventory = new LinkedHashMap<>();
    inventory.put("expiryWarnDays", 30);
    return inventory;
  }

  private static String required(String value, String field) {
    if (value == null || value.isBlank()) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY, "VALIDATION_ERROR", "Missing required field: " + field);
    }
    return value.trim();
  }

  private static String blankToNull(String value) {
    if (value == null || value.isBlank()) {
      return null;
    }
    return value.trim();
  }

  private static ApiException forbidden() {
    return new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Forbidden");
  }

  private static ApiException notFound() {
    return new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Branch not found");
  }
}
