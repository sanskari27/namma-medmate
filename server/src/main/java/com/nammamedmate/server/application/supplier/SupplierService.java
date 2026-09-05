package com.nammamedmate.server.application.supplier;

import com.nammamedmate.server.application.access.AccessQueryService;
import com.nammamedmate.server.application.audit.AuditRecordCommand;
import com.nammamedmate.server.application.audit.AuditService;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.ModuleCode;
import com.nammamedmate.server.domain.Supplier;
import com.nammamedmate.server.domain.SupplierBankDetails;
import com.nammamedmate.server.domain.SupplierCategory;
import com.nammamedmate.server.domain.SupplierLicenseStatus;
import com.nammamedmate.server.domain.SupplierPolicy;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.ProductCategoryRepository;
import com.nammamedmate.server.persistence.SupplierCategoryRepository;
import com.nammamedmate.server.persistence.SupplierRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SupplierService {

  private final SupplierRepository supplierRepository;
  private final SupplierCategoryRepository supplierCategoryRepository;
  private final ProductCategoryRepository productCategoryRepository;
  private final LocationRepository locationRepository;
  private final AppUserRepository appUserRepository;
  private final AccessQueryService accessQueryService;
  private final AuditService auditService;
  private final Clock clock;

  public SupplierService(
      SupplierRepository supplierRepository,
      SupplierCategoryRepository supplierCategoryRepository,
      ProductCategoryRepository productCategoryRepository,
      LocationRepository locationRepository,
      AppUserRepository appUserRepository,
      AccessQueryService accessQueryService,
      AuditService auditService,
      Clock clock) {
    this.supplierRepository = supplierRepository;
    this.supplierCategoryRepository = supplierCategoryRepository;
    this.productCategoryRepository = productCategoryRepository;
    this.locationRepository = locationRepository;
    this.appUserRepository = appUserRepository;
    this.accessQueryService = accessQueryService;
    this.auditService = auditService;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public List<SupplierView> list(AuthPrincipal principal, String query) {
    UUID tenantId = requireSupplierAccess(principal);
    String q = query == null ? "" : query.trim();
    List<Supplier> rows =
        q.isEmpty()
            ? supplierRepository.findAllByTenantIdOrderByLegalNameAsc(tenantId)
            : supplierRepository.searchByTenant(tenantId, q);
    return rows.stream().map(row -> toView(principal, row)).toList();
  }

  @Transactional(readOnly = true)
  public SupplierView get(AuthPrincipal principal, UUID id) {
    UUID tenantId = requireSupplierAccess(principal);
    return toView(principal, requireSupplier(id, tenantId));
  }

  @Transactional
  public SupplierView create(AuthPrincipal principal, SupplierCommand command) {
    UUID tenantId = requireSupplierAccess(principal);
    Instant now = clock.instant();
    LocalDate today = LocalDate.ofInstant(now, ZoneOffset.UTC);
    NormalizedSupplier normalized = normalize(command, today, null);
    assertCodeAvailable(tenantId, normalized.supplierCode(), null);
    assertGstinAvailable(tenantId, normalized.gstin(), null);
    List<UUID> categoryIds = requireCategories(tenantId, command.categoryIds());

    Supplier supplier = new Supplier();
    supplier.setId(UUID.randomUUID());
    supplier.setTenantId(tenantId);
    apply(supplier, normalized);
    supplier.setCreatedAt(now);
    supplier.setUpdatedAt(now);
    Supplier saved = supplierRepository.save(supplier);
    replaceCategories(tenantId, saved.getId(), categoryIds);
    audit(principal, "SUPPLIER_CREATE", saved.getId());
    return toView(principal, saved);
  }

  @Transactional
  public SupplierView update(AuthPrincipal principal, UUID id, SupplierCommand command) {
    UUID tenantId = requireSupplierAccess(principal);
    Supplier supplier = requireSupplier(id, tenantId);
    Instant now = clock.instant();
    LocalDate today = LocalDate.ofInstant(now, ZoneOffset.UTC);
    NormalizedSupplier normalized = normalize(command, today, supplier.getAccountNumber());
    assertCodeAvailable(tenantId, normalized.supplierCode(), id);
    assertGstinAvailable(tenantId, normalized.gstin(), id);
    List<UUID> categoryIds = requireCategories(tenantId, command.categoryIds());

    apply(supplier, normalized);
    supplier.setUpdatedAt(now);
    Supplier saved = supplierRepository.save(supplier);
    replaceCategories(tenantId, saved.getId(), categoryIds);
    audit(principal, "SUPPLIER_UPDATE", saved.getId());
    return toView(principal, saved);
  }

  private NormalizedSupplier normalize(
      SupplierCommand command, LocalDate today, String existingAccount) {
    String code = SupplierPolicy.requireCode(command.supplierCode());
    String legalName = SupplierPolicy.requireLegalName(command.legalName());
    if (command.supplierType() == null
        || command.paymentTerms() == null
        || command.status() == null) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
    String gstin = SupplierPolicy.optionalGstin(command.gstin());
    String pan = SupplierPolicy.optionalPan(command.pan());
    String licenseNumber = SupplierPolicy.optional(command.drugLicenseNumber());
    SupplierPolicy.requireLicenseDates(
        licenseNumber, command.drugLicenseExpiry(), command.status(), today);
    SupplierBankDetails bank =
        SupplierPolicy.requireBank(
            command.bankName(),
            command.accountHolderName(),
            command.accountNumber(),
            command.confirmAccountNumber(),
            command.ifscCode(),
            command.upiId(),
            existingAccount);
    return new NormalizedSupplier(
        code,
        legalName,
        SupplierPolicy.optional(command.tradeName()),
        command.supplierType(),
        gstin,
        pan,
        licenseNumber,
        command.drugLicenseType(),
        command.drugLicenseExpiry(),
        SupplierPolicy.optional(command.fssaiLicenseNumber()),
        SupplierPolicy.requireContactName(command.contactPersonName()),
        SupplierPolicy.optional(command.contactPersonRole()),
        SupplierPolicy.requirePhone(command.phone()),
        SupplierPolicy.optional(command.alternatePhone()),
        SupplierPolicy.optional(command.email()),
        SupplierPolicy.optional(command.website()),
        SupplierPolicy.requireAddressLine1(command.addressLine1()),
        SupplierPolicy.optional(command.addressLine2()),
        SupplierPolicy.requireCity(command.city()),
        SupplierPolicy.requireState(command.state()),
        SupplierPolicy.requirePincode(command.pincode()),
        SupplierPolicy.requireCountry(command.country()),
        command.paymentTerms(),
        SupplierPolicy.optionalCreditPeriodDays(command.creditPeriodDays()),
        SupplierPolicy.optionalCreditLimitPaise(command.creditLimitPaise()),
        bank,
        command.status(),
        SupplierPolicy.optional(command.notes()));
  }

  private static void apply(Supplier supplier, NormalizedSupplier normalized) {
    supplier.setSupplierCode(normalized.supplierCode());
    supplier.setLegalName(normalized.legalName());
    supplier.setTradeName(normalized.tradeName());
    supplier.setSupplierType(normalized.supplierType());
    supplier.setGstin(normalized.gstin());
    supplier.setPan(normalized.pan());
    supplier.setDrugLicenseNumber(normalized.drugLicenseNumber());
    supplier.setDrugLicenseType(normalized.drugLicenseType());
    supplier.setDrugLicenseExpiry(normalized.drugLicenseExpiry());
    supplier.setFssaiLicenseNumber(normalized.fssaiLicenseNumber());
    supplier.setContactPersonName(normalized.contactPersonName());
    supplier.setContactPersonRole(normalized.contactPersonRole());
    supplier.setPhone(normalized.phone());
    supplier.setAlternatePhone(normalized.alternatePhone());
    supplier.setEmail(normalized.email());
    supplier.setWebsite(normalized.website());
    supplier.setAddressLine1(normalized.addressLine1());
    supplier.setAddressLine2(normalized.addressLine2());
    supplier.setCity(normalized.city());
    supplier.setState(normalized.state());
    supplier.setPincode(normalized.pincode());
    supplier.setCountry(normalized.country());
    supplier.setPaymentTerms(normalized.paymentTerms());
    supplier.setCreditPeriodDays(normalized.creditPeriodDays());
    supplier.setCreditLimitPaise(normalized.creditLimitPaise());
    supplier.setBankName(normalized.bank().bankName());
    supplier.setAccountHolderName(normalized.bank().accountHolderName());
    supplier.setAccountNumber(normalized.bank().accountNumber());
    supplier.setIfscCode(normalized.bank().ifscCode());
    supplier.setUpiId(normalized.bank().upiId());
    supplier.setStatus(normalized.status());
    supplier.setNotes(normalized.notes());
  }

  private List<UUID> requireCategories(UUID tenantId, List<UUID> categoryIds) {
    if (categoryIds == null || categoryIds.isEmpty()) {
      return List.of();
    }
    Set<UUID> unique = new LinkedHashSet<>(categoryIds);
    List<UUID> ordered = new ArrayList<>();
    for (UUID categoryId : unique) {
      if (categoryId == null) {
        continue;
      }
      productCategoryRepository
          .findByIdAndTenantId(categoryId, tenantId)
          .orElseThrow(
              () -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Category was not found"));
      ordered.add(categoryId);
    }
    return ordered;
  }

  private void replaceCategories(UUID tenantId, UUID supplierId, List<UUID> categoryIds) {
    supplierCategoryRepository.deleteBySupplierIdAndTenantId(supplierId, tenantId);
    supplierCategoryRepository.flush();
    for (UUID categoryId : categoryIds) {
      SupplierCategory row = new SupplierCategory();
      row.setId(UUID.randomUUID());
      row.setTenantId(tenantId);
      row.setSupplierId(supplierId);
      row.setCategoryId(categoryId);
      supplierCategoryRepository.save(row);
    }
  }

  private void assertCodeAvailable(UUID tenantId, String code, UUID excludeId) {
    supplierRepository
        .findByTenantIdAndSupplierCode(tenantId, code)
        .ifPresent(
            existing -> {
              if (excludeId == null || !existing.getId().equals(excludeId)) {
                throw SupplierPolicy.codeTaken();
              }
            });
  }

  private void assertGstinAvailable(UUID tenantId, String gstin, UUID excludeId) {
    if (gstin == null) {
      return;
    }
    supplierRepository
        .findByTenantIdAndGstin(tenantId, gstin)
        .ifPresent(
            existing -> {
              if (excludeId == null || !existing.getId().equals(excludeId)) {
                throw SupplierPolicy.gstinTaken();
              }
            });
  }

  private Supplier requireSupplier(UUID id, UUID tenantId) {
    return supplierRepository
        .findByIdAndTenantId(id, tenantId)
        .orElseThrow(
            () -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Supplier was not found"));
  }

  private UUID requireSupplierAccess(AuthPrincipal principal) {
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
            .orElseThrow(SupplierService::forbidden);
    Set<ModuleCode> modules = accessQueryService.effectiveModules(user);
    if (!modules.contains(ModuleCode.PROCUREMENT) && !modules.contains(ModuleCode.FINANCE)) {
      throw forbidden();
    }
    return principal.tenantId();
  }

  private SupplierView toView(AuthPrincipal principal, Supplier supplier) {
    LocalDate today = LocalDate.ofInstant(clock.instant(), ZoneOffset.UTC);
    SupplierLicenseStatus licenseStatus =
        SupplierPolicy.licenseStatus(
            supplier.getDrugLicenseNumber(), supplier.getDrugLicenseExpiry(), today);
    List<UUID> categoryIds =
        supplierCategoryRepository
            .findAllBySupplierIdAndTenantId(supplier.getId(), supplier.getTenantId())
            .stream()
            .map(SupplierCategory::getCategoryId)
            .toList();
    return new SupplierView(
        supplier.getId(),
        supplier.getTenantId(),
        supplier.getSupplierCode(),
        supplier.getLegalName(),
        supplier.getTradeName(),
        supplier.getSupplierType(),
        supplier.getGstin(),
        supplier.getPan(),
        supplier.getDrugLicenseNumber(),
        supplier.getDrugLicenseType(),
        supplier.getDrugLicenseExpiry(),
        supplier.getFssaiLicenseNumber(),
        licenseStatus,
        supplier.getContactPersonName(),
        supplier.getContactPersonRole(),
        supplier.getPhone(),
        supplier.getAlternatePhone(),
        supplier.getEmail(),
        supplier.getWebsite(),
        supplier.getAddressLine1(),
        supplier.getAddressLine2(),
        supplier.getCity(),
        supplier.getState(),
        supplier.getPincode(),
        supplier.getCountry(),
        supplier.getPaymentTerms(),
        supplier.getCreditPeriodDays(),
        supplier.getCreditLimitPaise(),
        supplier.getBankName(),
        supplier.getAccountHolderName(),
        supplier.getAccountNumber(),
        supplier.getIfscCode(),
        supplier.getUpiId(),
        categoryIds,
        supplier.getStatus(),
        supplier.getNotes(),
        supplier.getCreatedAt(),
        supplier.getUpdatedAt(),
        branchProcurement(principal, supplier.getTenantId()));
  }

  private SupplierView.BranchProcurementView branchProcurement(
      AuthPrincipal principal, UUID tenantId) {
    UUID branchId = principal == null ? null : principal.activeBranchId();
    if (branchId == null) {
      return new SupplierView.BranchProcurementView(null, null, List.of());
    }
    String name =
        locationRepository
            .findByIdAndTenantIdAndDeletedAtIsNull(branchId, tenantId)
            .map(Location::getName)
            .orElse(null);
    return new SupplierView.BranchProcurementView(branchId, name, List.of());
  }

  private void audit(AuthPrincipal principal, String action, UUID supplierId) {
    auditService.record(
        new AuditRecordCommand(
            principal.userId(),
            principal.tenantId(),
            principal.activeBranchId(),
            action,
            AuditService.OUTCOME_SUCCESS,
            null,
            null,
            null,
            principal.sessionId(),
            "{\"supplierId\":\"" + supplierId + "\"}"));
  }

  private static ApiException forbidden() {
    return new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Forbidden");
  }

  private record NormalizedSupplier(
      String supplierCode,
      String legalName,
      String tradeName,
      com.nammamedmate.server.domain.SupplierType supplierType,
      String gstin,
      String pan,
      String drugLicenseNumber,
      com.nammamedmate.server.domain.DrugLicenseType drugLicenseType,
      LocalDate drugLicenseExpiry,
      String fssaiLicenseNumber,
      String contactPersonName,
      String contactPersonRole,
      String phone,
      String alternatePhone,
      String email,
      String website,
      String addressLine1,
      String addressLine2,
      String city,
      String state,
      String pincode,
      String country,
      com.nammamedmate.server.domain.SupplierPaymentTerms paymentTerms,
      Integer creditPeriodDays,
      Long creditLimitPaise,
      SupplierBankDetails bank,
      com.nammamedmate.server.domain.SupplierStatus status,
      String notes) {}
}
