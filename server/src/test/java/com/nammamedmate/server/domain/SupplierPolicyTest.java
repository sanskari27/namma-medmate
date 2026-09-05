package com.nammamedmate.server.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.nammamedmate.server.shared.exception.ApiException;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class SupplierPolicyTest {

  private static final LocalDate TODAY = LocalDate.of(2026, 9, 5);

  @Test
  void ac01_normalizesIdentityGstinAndDefaultCountry() {
    assertThat(SupplierPolicy.requireCode("sup-0001")).isEqualTo("SUP-0001");
    assertThat(SupplierPolicy.optionalGstin("29abcde1234f1z5")).isEqualTo("29ABCDE1234F1Z5");
    assertThat(SupplierPolicy.requireCountry(null)).isEqualTo("India");
    assertThat(SupplierPolicy.optionalCreditLimitPaise(250000L)).isEqualTo(250000L);
  }

  @Test
  void ac04_hasNoRatingHelpers() {
    assertThat(SupplierPolicy.class.getDeclaredMethods())
        .extracting(java.lang.reflect.Method::getName)
        .doesNotContain("rating", "performanceScore", "onTimePercent");
  }

  @Test
  void ac05_expiredLicenseBlockedOnActiveSupplier() {
    assertThatThrownBy(
            () ->
                SupplierPolicy.requireLicenseDates(
                    "KA-DL-1", LocalDate.of(2026, 1, 1), SupplierStatus.ACTIVE, TODAY))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(SupplierPolicy.LICENSE_DATE_INVALID);
  }

  @Test
  void ac05_expiryWithoutNumberIsInvalid() {
    assertThatThrownBy(
            () ->
                SupplierPolicy.requireLicenseDates(
                    null, LocalDate.of(2028, 1, 1), SupplierStatus.ACTIVE, TODAY))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(SupplierPolicy.LICENSE_DATE_INVALID);
  }

  @Test
  void ac05_incompleteBankIsUnsafe() {
    assertThatThrownBy(
            () ->
                SupplierPolicy.requireBank(
                    "HDFC", "Acme Distributors", "123456789012", null, null, null, null))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(SupplierPolicy.UNSAFE_BANK_UPDATE);
  }

  @Test
  void ac05_unconfirmedAccountChangeIsUnsafe() {
    assertThatThrownBy(
            () ->
                SupplierPolicy.requireBank(
                    "HDFC",
                    "Acme Distributors",
                    "999999999999",
                    "123456789012",
                    "HDFC0001234",
                    null,
                    "123456789012"))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(SupplierPolicy.UNSAFE_BANK_UPDATE);
  }

  @Test
  void ac01_confirmedBankPersistsTogether() {
    SupplierBankDetails bank =
        SupplierPolicy.requireBank(
            "HDFC",
            "Acme Distributors",
            "123456789012",
            "123456789012",
            "hdfc0001234",
            "acme@hdfcbank",
            null);
    assertThat(bank.ifscCode()).isEqualTo("HDFC0001234");
    assertThat(bank.accountNumber()).isEqualTo("123456789012");
  }

  @Test
  void licenseStatusUsesExpiryWindow() {
    assertThat(SupplierPolicy.licenseStatus(null, null, TODAY))
        .isEqualTo(SupplierLicenseStatus.MISSING);
    assertThat(SupplierPolicy.licenseStatus("KA-1", LocalDate.of(2026, 9, 20), TODAY))
        .isEqualTo(SupplierLicenseStatus.EXPIRING);
    assertThat(SupplierPolicy.licenseStatus("KA-1", LocalDate.of(2028, 1, 1), TODAY))
        .isEqualTo(SupplierLicenseStatus.VALID);
    assertThat(SupplierPolicy.licenseStatus("KA-1", LocalDate.of(2026, 1, 1), TODAY))
        .isEqualTo(SupplierLicenseStatus.EXPIRED);
  }
}
