package com.nammamedmate.server.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.nammamedmate.server.shared.exception.ApiException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class HospitalPolicyTest {

  @Test
  void ac01_proOnlyEntitlement() {
    assertThat(HospitalPolicy.entitled(PlanCode.PRO)).isTrue();
    assertThat(HospitalPolicy.entitled(PlanCode.GROWTH)).isFalse();
    assertThatThrownBy(() -> HospitalPolicy.assertEntitled(PlanCode.FREE))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(HospitalPolicy.PLAN_LIMIT);
  }

  @Test
  void ac03_uniformPercentAppliesWhenNoProductRule() {
    assertThat(HospitalPolicy.creditPricePaise(10_000L, 500, null, null)).isEqualTo(9_500L);
  }

  @Test
  void ac03_productPercentOverride() {
    assertThat(HospitalPolicy.creditPricePaise(10_000L, 500, HospitalPriceRuleType.PERCENT, 1_000))
        .isEqualTo(9_000L);
  }

  @Test
  void ac03_productFlatOverride() {
    assertThat(
            HospitalPolicy.creditPricePaise(10_000L, 500, HospitalPriceRuleType.FLAT_PAISE, 1_500))
        .isEqualTo(8_500L);
  }

  @Test
  void ac05_zeroCapacityRejected() {
    assertThatThrownBy(() -> HospitalPolicy.requirePositiveCapacity(0))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getStatus())
        .isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
  }

  @Test
  void ac04_bedOccupiedCode() {
    assertThat(HospitalPolicy.bedOccupied().getCode()).isEqualTo(HospitalPolicy.BED_OCCUPIED);
    assertThat(HospitalPolicy.bedOccupied().getStatus()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
  }

  @Test
  void ac01_departmentTypeParser() {
    assertThat(HospitalPolicy.parseDepartmentType("opd")).isEqualTo(HospitalDepartmentType.OPD);
    assertThat(HospitalPolicy.parseDepartmentType("DIAGNOSTIC"))
        .isEqualTo(HospitalDepartmentType.DIAGNOSTIC);
    assertThatThrownBy(() -> HospitalPolicy.parseDepartmentType("invalid"))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getStatus())
        .isEqualTo(HttpStatus.BAD_REQUEST);
  }

  @Test
  void ac02_doctorStatusParser() {
    assertThat(HospitalPolicy.parseDoctorStatus("available"))
        .isEqualTo(HospitalDoctorStatus.AVAILABLE);
    assertThat(HospitalPolicy.parseDoctorStatus("ON_LEAVE"))
        .isEqualTo(HospitalDoctorStatus.ON_LEAVE);
    assertThatThrownBy(() -> HospitalPolicy.parseDoctorStatus(""))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getStatus())
        .isEqualTo(HttpStatus.BAD_REQUEST);
  }

  @Test
  void ac03_payerTypeParser() {
    assertThat(HospitalPolicy.parsePayerType("self_pay")).isEqualTo(HospitalPayerType.SELF_PAY);
    assertThat(HospitalPolicy.parsePayerType("INSURANCE_TPA"))
        .isEqualTo(HospitalPayerType.INSURANCE_TPA);
    assertThatThrownBy(() -> HospitalPolicy.parsePayerType("cash"))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getStatus())
        .isEqualTo(HttpStatus.BAD_REQUEST);
  }

  @Test
  void ac03_tpaRequiresInsurerAndPolicy() {
    assertThatThrownBy(() -> HospitalPolicy.requireTpaFields("", "POL-1"))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(HospitalPolicy.TPA_INCOMPLETE);
    assertThatThrownBy(() -> HospitalPolicy.requireTpaFields("Star", ""))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(HospitalPolicy.TPA_INCOMPLETE);
  }

  @Test
  void ac02_uhidFormatAndTakenCode() {
    assertThat(HospitalPolicy.formatUhid(1)).isEqualTo("UHID-00001");
    assertThat(HospitalPolicy.uhidTaken().getCode()).isEqualTo(HospitalPolicy.UHID_TAKEN);
  }

  @Test
  void ac05_discountOverMrpRejected() {
    assertThatThrownBy(
            () -> HospitalPolicy.creditPricePaise(1_000L, 0, HospitalPriceRuleType.PERCENT, 15_000))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getStatus())
        .isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
  }

  @Test
  void ac01_indentFormat() {
    assertThat(HospitalPolicy.formatIndent(1)).isEqualTo("IND-00001");
    assertThat(HospitalPolicy.formatIndent(42)).isEqualTo("IND-00042");
  }

  @Test
  void ac02_indentStatusParser() {
    assertThat(HospitalPolicy.parseIndentStatus("pending")).isEqualTo(HospitalIndentStatus.PENDING);
    assertThat(HospitalPolicy.parseIndentStatus("APPROVED"))
        .isEqualTo(HospitalIndentStatus.APPROVED);
    assertThatThrownBy(() -> HospitalPolicy.parseIndentStatus("bad"))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getStatus())
        .isEqualTo(HttpStatus.BAD_REQUEST);
  }

  @Test
  void ac05_indentWriterAllowsOwnerPharmacistInventory() {
    HospitalPolicy.requireIndentWriter(AppUserRole.pharmacy_owner, false, false, true);
    HospitalPolicy.requireIndentWriter(AppUserRole.pharmacy_staff, true, false, true);
    HospitalPolicy.requireIndentWriter(AppUserRole.pharmacy_staff, false, true, true);
  }

  @Test
  void ac05_indentWriterBlocksCashierAndMissingHospital() {
    assertThatThrownBy(
            () ->
                HospitalPolicy.requireIndentWriter(AppUserRole.pharmacy_staff, false, false, true))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getStatus())
        .isEqualTo(HttpStatus.FORBIDDEN);
    assertThatThrownBy(
            () -> HospitalPolicy.requireIndentWriter(AppUserRole.pharmacy_staff, true, true, false))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getStatus())
        .isEqualTo(HttpStatus.FORBIDDEN);
  }

  @Test
  void ac02_approveRejectStaleState() {
    HospitalPolicy.assertCanApprove(HospitalIndentStatus.PENDING);
    HospitalPolicy.assertCanApprove(HospitalIndentStatus.APPROVED);
    assertThatThrownBy(() -> HospitalPolicy.assertCanApprove(HospitalIndentStatus.REJECTED))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(HospitalPolicy.STALE_STATE);
    HospitalPolicy.assertCanReject(HospitalIndentStatus.PENDING);
    HospitalPolicy.assertCanReject(HospitalIndentStatus.REJECTED);
    assertThatThrownBy(() -> HospitalPolicy.assertCanReject(HospitalIndentStatus.APPROVED))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(HospitalPolicy.STALE_STATE);
  }

  @Test
  void ac01_wsInvoiceNumber() {
    assertThat(HospitalPolicy.wsInvoiceNumber("2026-27", "BR01", 1))
        .isEqualTo("WS/2026-27/BR01/00001");
    assertThat(HospitalPolicy.wsInvoiceNumber("2026-27", "AN01", 42))
        .isEqualTo("WS/2026-27/AN01/00042");
  }

  @Test
  void ac02_assertCanIssueApprovedOnly() {
    HospitalPolicy.assertCanIssue(HospitalIndentStatus.APPROVED);
    assertThatThrownBy(() -> HospitalPolicy.assertCanIssue(HospitalIndentStatus.ISSUED))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(HospitalPolicy.STALE_STATE);
    assertThatThrownBy(() -> HospitalPolicy.assertCanIssue(HospitalIndentStatus.PENDING))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(HospitalPolicy.STALE_STATE);
  }

  @Test
  void ac03_refillRequiresUhid() {
    HospitalPolicy.requireUhidForRefill(HospitalIssueReason.FLOOR_STOCK, null);
    HospitalPolicy.requireUhidForRefill(HospitalIssueReason.CONSUMPTION, "");
    HospitalPolicy.requireUhidForRefill(HospitalIssueReason.PATIENT_REFILL, "UHID-00001");
    assertThatThrownBy(
            () -> HospitalPolicy.requireUhidForRefill(HospitalIssueReason.PATIENT_REFILL, "  "))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(HospitalPolicy.UHID_REQUIRED);
  }

  @Test
  void ac05_creditLimitBlocksWhenBilledWouldExceed() {
    HospitalPolicy.assertCreditAvailable(0L, 50_000L, 100_000L);
    assertThatThrownBy(() -> HospitalPolicy.assertCreditAvailable(90_000L, 20_000L, 100_000L))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(HospitalPolicy.CREDIT_LIMIT);
  }

  @Test
  void ac03_issueReasonParser() {
    assertThat(HospitalPolicy.parseIssueReason("floor_stock"))
        .isEqualTo(HospitalIssueReason.FLOOR_STOCK);
    assertThat(HospitalPolicy.parseIssueReason("PATIENT_REFILL"))
        .isEqualTo(HospitalIssueReason.PATIENT_REFILL);
    assertThatThrownBy(() -> HospitalPolicy.parseIssueReason("gift"))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getStatus())
        .isEqualTo(HttpStatus.BAD_REQUEST);
  }
}
