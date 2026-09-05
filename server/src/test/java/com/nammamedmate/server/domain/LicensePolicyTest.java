package com.nammamedmate.server.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.nammamedmate.server.shared.exception.ApiException;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class LicensePolicyTest {

  private static final LocalDate TODAY = LocalDate.of(2026, 9, 5);

  @Test
  void ac01_acceptsDrugGstFssaiAndPharmacistTypes() {
    assertThat(LicensePolicy.requireType("drug_license")).isEqualTo(ComplianceDocType.DRUG_LICENSE);
    assertThat(LicensePolicy.requireType("GST")).isEqualTo(ComplianceDocType.GST);
    assertThat(LicensePolicy.requireType("FSSAI")).isEqualTo(ComplianceDocType.FSSAI);
    assertThat(LicensePolicy.requireType("PHARMACIST_REGISTRATION"))
        .isEqualTo(ComplianceDocType.PHARMACIST_REGISTRATION);
  }

  @Test
  void ac01_pharmacyDocsAreTenantOrBranchNotStaff() {
    assertThat(LicensePolicy.requireScope(ComplianceDocType.DRUG_LICENSE, "TENANT", null, null))
        .isEqualTo(ComplianceLicenseScope.TENANT);
    UUID branchId = UUID.randomUUID();
    assertThat(LicensePolicy.requireScope(ComplianceDocType.GST, "BRANCH", branchId, null))
        .isEqualTo(ComplianceLicenseScope.BRANCH);
    assertThatThrownBy(
            () ->
                LicensePolicy.requireScope(
                    ComplianceDocType.FSSAI, "STAFF", null, UUID.randomUUID()))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getStatus().value())
        .isEqualTo(400);
  }

  @Test
  void ac01_pharmacistRegistrationIsStaffScoped() {
    UUID staffId = UUID.randomUUID();
    assertThat(
            LicensePolicy.requireScope(
                ComplianceDocType.PHARMACIST_REGISTRATION, "STAFF", null, staffId))
        .isEqualTo(ComplianceLicenseScope.STAFF);
    assertThatThrownBy(
            () ->
                LicensePolicy.requireScope(
                    ComplianceDocType.PHARMACIST_REGISTRATION, "TENANT", null, staffId))
        .isInstanceOf(ApiException.class);
  }

  @Test
  void ac01_pharmacistNumberRequired() {
    assertThat(LicensePolicy.requireNumber(ComplianceDocType.PHARMACIST_REGISTRATION, " KA-123 "))
        .isEqualTo("KA-123");
    assertThatThrownBy(
            () -> LicensePolicy.requireNumber(ComplianceDocType.PHARMACIST_REGISTRATION, "  "))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(LicensePolicy.INVALID_LICENSE);
  }

  @Test
  void ac05_expiryBeforeIssueIsInvalid() {
    assertThatThrownBy(
            () -> LicensePolicy.requireDates(LocalDate.of(2026, 6, 1), LocalDate.of(2026, 5, 1)))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(LicensePolicy.LICENSE_DATE_INVALID);
  }

  @Test
  void ac02_dueWithinThirtyDaysIncludingToday() {
    assertThat(LicensePolicy.ALERT_DAYS).isEqualTo(30);
    assertThat(LicensePolicy.dueCutoff(TODAY)).isEqualTo(LocalDate.of(2026, 10, 5));
    assertThat(LicensePolicy.isDue(TODAY.plusDays(30), TODAY)).isTrue();
    assertThat(LicensePolicy.isDue(TODAY.plusDays(31), TODAY)).isFalse();
    assertThat(LicensePolicy.isDue(TODAY.minusDays(1), TODAY)).isTrue();
  }

  @Test
  void ac05_missingEvidenceAndStaleVersion() {
    assertThatThrownBy(() -> LicensePolicy.requireEvidencePresent(false))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(LicensePolicy.MISSING_EVIDENCE);
    assertThatThrownBy(() -> LicensePolicy.requireVersion(2, 1))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(LicensePolicy.STALE_STATE);
  }
}
