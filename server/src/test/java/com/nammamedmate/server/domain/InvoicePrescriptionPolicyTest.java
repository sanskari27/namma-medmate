package com.nammamedmate.server.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.nammamedmate.server.shared.exception.ApiException;
import java.math.BigDecimal;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class InvoicePrescriptionPolicyTest {

  @Test
  void ac01_rxSaleStoresVerifiedCheckboxAndReferenceNotImage() {
    assertThat(InvoicePrescriptionPolicy.requireReference(false, false, null)).isNull();
    assertThat(InvoicePrescriptionPolicy.requireReference(true, true, " RX-1 ")).isEqualTo("RX-1");
    assertThatThrownBy(() -> InvoicePrescriptionPolicy.requireReference(true, false, "RX-1"))
        .isInstanceOf(ApiException.class)
        .satisfies(
            ex -> {
              ApiException api = (ApiException) ex;
              assertThat(api.getStatus()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
              assertThat(api.getCode()).isEqualTo(InvoicePrescriptionPolicy.RX_REQUIRED);
            });
    assertThatThrownBy(() -> InvoicePrescriptionPolicy.requireReference(true, true, "  "))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(InvoicePrescriptionPolicy.RX_REQUIRED);
  }

  @Test
  void ac03_remainingIsPrescribedMinusFulfilledAndOverFillFails() {
    assertThat(InvoicePrescriptionPolicy.remaining(new BigDecimal("90"), new BigDecimal("30")))
        .isEqualByComparingTo("60");
    InvoicePrescriptionPolicy.assertCanFill(
        new BigDecimal("90"), new BigDecimal("30"), new BigDecimal("30"));
    InvoicePrescriptionPolicy.assertCanFill(
        new BigDecimal("90"), BigDecimal.ZERO, new BigDecimal("90"));
    assertThatThrownBy(
            () ->
                InvoicePrescriptionPolicy.assertCanFill(
                    new BigDecimal("90"), BigDecimal.ZERO, new BigDecimal("91")))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(InvoicePrescriptionPolicy.OVER_FULFILLMENT);
    assertThatThrownBy(
            () ->
                InvoicePrescriptionPolicy.assertCanFill(
                    new BigDecimal("90"), new BigDecimal("30"), new BigDecimal("61")))
        .isInstanceOf(ApiException.class)
        .satisfies(
            ex -> {
              ApiException api = (ApiException) ex;
              assertThat(api.getStatus()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
              assertThat(api.getCode()).isEqualTo(InvoicePrescriptionPolicy.OVER_FULFILLMENT);
            });
  }

  @Test
  void ac05_foreignBindAndMissingPrescribedFail() {
    UUID patient = UUID.randomUUID();
    InvoicePrescriptionPolicy.assertCustomerBind(null, patient);
    InvoicePrescriptionPolicy.assertCustomerBind(patient, patient);
    assertThatThrownBy(
            () -> InvoicePrescriptionPolicy.assertCustomerBind(patient, UUID.randomUUID()))
        .isInstanceOf(ApiException.class)
        .satisfies(
            ex -> {
              ApiException api = (ApiException) ex;
              assertThat(api.getStatus()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
              assertThat(api.getCode()).isEqualTo(InvoicePrescriptionPolicy.FOREIGN_REFERENCE);
            });
    assertThat(InvoicePrescriptionPolicy.requirePrescribed(false, null)).isNull();
    assertThat(InvoicePrescriptionPolicy.requirePrescribed(true, new BigDecimal("90")))
        .isEqualByComparingTo("90");
    assertThatThrownBy(() -> InvoicePrescriptionPolicy.requirePrescribed(true, null))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(InvoicePrescriptionPolicy.PRESCRIBED_REQUIRED);
  }
}
