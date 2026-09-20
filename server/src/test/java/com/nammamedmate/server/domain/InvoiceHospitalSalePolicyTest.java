package com.nammamedmate.server.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.nammamedmate.server.shared.exception.ApiException;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class InvoiceHospitalSalePolicyTest {

  @Test
  void ac01_blankSourceIsCounterWithoutUhid() {
    assertThat(InvoiceHospitalSalePolicy.parseSource(null)).isEqualTo(InvoiceSaleSource.COUNTER);
    assertThat(InvoiceHospitalSalePolicy.parseSource("")).isEqualTo(InvoiceSaleSource.COUNTER);
    assertThat(InvoiceHospitalSalePolicy.requireUhid(InvoiceSaleSource.COUNTER, null)).isNull();
    assertThat(InvoiceHospitalSalePolicy.requireWard(InvoiceSaleSource.COUNTER, null)).isNull();
    InvoiceHospitalSalePolicy.assertHospitalAccess(InvoiceSaleSource.COUNTER, PlanCode.FREE, false);
  }

  @Test
  void ac01_hospitalSourcesNeedProAndHospitalModule() {
    assertThatThrownBy(
            () ->
                InvoiceHospitalSalePolicy.assertHospitalAccess(
                    InvoiceSaleSource.WARD, PlanCode.FREE, true))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(HospitalPolicy.PLAN_LIMIT);
    assertThatThrownBy(
            () ->
                InvoiceHospitalSalePolicy.assertHospitalAccess(
                    InvoiceSaleSource.OPD_RX, PlanCode.PRO, false))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getStatus())
        .isEqualTo(HttpStatus.FORBIDDEN);
    InvoiceHospitalSalePolicy.assertHospitalAccess(InvoiceSaleSource.EMERGENCY, PlanCode.PRO, true);
  }

  @Test
  void ac03_wardRequiresUhidAndWard() {
    assertThatThrownBy(() -> InvoiceHospitalSalePolicy.requireUhid(InvoiceSaleSource.WARD, " "))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(InvoiceHospitalSalePolicy.UHID_REQUIRED);
    assertThatThrownBy(() -> InvoiceHospitalSalePolicy.requireWard(InvoiceSaleSource.WARD, null))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(InvoiceHospitalSalePolicy.WARD_REQUIRED);
  }

  @Test
  void ac03_emergencyRequiresUhidAndAllowsMissingWard() {
    assertThat(InvoiceHospitalSalePolicy.requireUhid(InvoiceSaleSource.EMERGENCY, "UHID-9"))
        .isEqualTo("UHID-9");
    assertThat(InvoiceHospitalSalePolicy.requireWard(InvoiceSaleSource.EMERGENCY, null)).isNull();
  }

  @Test
  void ac05_dischargedAdmissionCannotTakeWardBill() {
    HospitalAdmission admission = new HospitalAdmission();
    admission.setWardId(UUID.randomUUID());
    admission.setStatus(HospitalAdmissionStatus.DISCHARGED);
    assertThatThrownBy(
            () ->
                InvoiceHospitalSalePolicy.assertActiveWardAdmission(
                    admission, admission.getWardId()))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(InvoiceHospitalSalePolicy.ADMISSION_DISCHARGED);
  }

  @Test
  void ac04_insuranceTenderNeedsInsurerAndPolicy() {
    InvoiceHospitalSalePolicy.assertInsuranceTender(false, null, null);
    assertThatThrownBy(() -> InvoiceHospitalSalePolicy.assertInsuranceTender(true, "Star", " "))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(InvoiceHospitalSalePolicy.TPA_INCOMPLETE);
    InvoiceHospitalSalePolicy.assertInsuranceTender(true, "Star Health", "POL-1");
  }
}
