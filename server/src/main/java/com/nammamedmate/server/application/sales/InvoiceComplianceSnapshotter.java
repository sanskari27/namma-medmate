package com.nammamedmate.server.application.sales;

import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.EinvoiceApplicability;
import com.nammamedmate.server.domain.EinvoiceStatus;
import com.nammamedmate.server.domain.KycSubmission;
import com.nammamedmate.server.domain.KycSubmissionStatus;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.SalesInvoice;
import com.nammamedmate.server.domain.SalesInvoiceLine;
import com.nammamedmate.server.domain.StaffRegistration;
import com.nammamedmate.server.domain.StaffRegistrationKind;
import com.nammamedmate.server.domain.StaffRegistrationStatus;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.KycSubmissionRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.ProductRepository;
import com.nammamedmate.server.persistence.StaffRegistrationRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.springframework.stereotype.Component;

@Component
public class InvoiceComplianceSnapshotter {

  private final LocationRepository locationRepository;
  private final TenantRepository tenantRepository;
  private final KycSubmissionRepository kycSubmissionRepository;
  private final AppUserRepository appUserRepository;
  private final StaffRegistrationRepository staffRegistrationRepository;
  private final ProductRepository productRepository;

  public InvoiceComplianceSnapshotter(
      LocationRepository locationRepository,
      TenantRepository tenantRepository,
      KycSubmissionRepository kycSubmissionRepository,
      AppUserRepository appUserRepository,
      StaffRegistrationRepository staffRegistrationRepository,
      ProductRepository productRepository) {
    this.locationRepository = locationRepository;
    this.tenantRepository = tenantRepository;
    this.kycSubmissionRepository = kycSubmissionRepository;
    this.appUserRepository = appUserRepository;
    this.staffRegistrationRepository = staffRegistrationRepository;
    this.productRepository = productRepository;
  }

  public void apply(SalesInvoice invoice, List<SalesInvoiceLine> lines) {
    Location branch =
        locationRepository
            .findByIdAndTenantIdAndDeletedAtIsNull(invoice.getBranchId(), invoice.getTenantId())
            .orElse(null);
    KycSubmission kyc =
        kycSubmissionRepository
            .findByTenantIdAndStatus(invoice.getTenantId(), KycSubmissionStatus.APPROVED)
            .orElse(null);
    Tenant tenant = tenantRepository.findById(invoice.getTenantId()).orElse(null);
    invoice.setPharmacyLegalName(firstNonBlank(kyc == null ? null : kyc.getLegalName(), tenant == null ? null : tenant.getName()));
    invoice.setPharmacyAddress(addressOf(branch, kyc));
    invoice.setPharmacyPhone(
        firstNonBlank(branch == null ? null : branch.getContactPhone(), kyc == null ? null : kyc.getContactPhone()));
    invoice.setPharmacyGstin(
        firstNonBlank(branch == null ? null : branch.getGstin(), kyc == null ? null : kyc.getGstin()));
    invoice.setPharmacyPan(kyc == null ? null : blankToNull(kyc.getPan()));
    invoice.setPharmacyDrugLicenseNumber(
        firstNonBlank(
            kyc == null ? null : kyc.getDrugLicenseNumber(),
            branch == null ? null : branch.getDrugLicenseNumber()));
    invoice.setPharmacyDrugLicenseType(null);
    AppUser staff = appUserRepository.findById(invoice.getStaffUserId()).orElse(null);
    StaffRegistration registration =
        staffRegistrationRepository.findByUserId(invoice.getStaffUserId()).orElse(null);
    invoice.setPharmacistName(staff == null ? null : blankToNull(staff.getDisplayName()));
    if (registration != null
        && registration.getStatus() == StaffRegistrationStatus.APPROVED
        && (registration.getKind() == StaffRegistrationKind.PHARMACIST
            || registration.getLicenseNumber() != null)) {
      invoice.setPharmacistRegistration(blankToNull(registration.getLicenseNumber()));
    } else {
      invoice.setPharmacistRegistration(null);
    }
    invoice.setEinvoiceApplicability(EinvoiceApplicability.NOT_APPLICABLE);
    invoice.setEinvoiceStatus(EinvoiceStatus.NOT_SUBMITTED);
    invoice.setEinvoiceIrn(null);
    invoice.setEinvoiceAckNo(null);
    invoice.setEinvoiceAckAt(null);
    for (SalesInvoiceLine line : lines) {
      productRepository
          .findByIdAndTenantId(line.getProductId(), invoice.getTenantId())
          .ifPresent(
              product -> {
                line.setScheduleClassification(product.getScheduleClassification());
                line.setControlledSubstance(product.isControlledSubstance());
              });
    }
  }

  private static String addressOf(Location branch, KycSubmission kyc) {
    if (branch != null) {
      String joined =
          Stream.of(
                  branch.getAddressLine(),
                  branch.getCity(),
                  branch.getState(),
                  branch.getPincode())
              .filter(part -> part != null && !part.isBlank())
              .collect(Collectors.joining(", "));
      if (!joined.isBlank()) {
        return joined;
      }
    }
    if (kyc == null) {
      return null;
    }
    return Stream.of(kyc.getAddressLine1(), kyc.getCity(), kyc.getState(), kyc.getPincode())
        .filter(part -> part != null && !part.isBlank())
        .collect(Collectors.joining(", "));
  }

  private static String firstNonBlank(String primary, String fallback) {
    String first = blankToNull(primary);
    return first != null ? first : blankToNull(fallback);
  }

  private static String blankToNull(String value) {
    if (value == null || value.isBlank()) {
      return null;
    }
    return value.trim();
  }
}
