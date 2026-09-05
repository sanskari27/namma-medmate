package com.nammamedmate.server.domain;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.nammamedmate.server.shared.exception.ApiException;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class QualityCheckPolicyTest {

  @Test
  void ac01_ownerOrPharmacistMayCheck() {
    QualityCheckPolicy.requirePharmacist(AppUserRole.pharmacy_owner, false);
    QualityCheckPolicy.requirePharmacist(AppUserRole.pharmacy_staff, true);
  }

  @Test
  void ac01_inventoryOrCashierCannotCheck() {
    assertThatThrownBy(
            () -> QualityCheckPolicy.requirePharmacist(AppUserRole.pharmacy_staff, false))
        .isInstanceOf(ApiException.class)
        .satisfies(
            ex -> {
              ApiException api = (ApiException) ex;
              assertCode(api, QualityCheckPolicy.PHARMACIST_REQUIRED, HttpStatus.FORBIDDEN);
            });
  }

  @Test
  void ac02_acceptingRequiresVisualAndChecklist() {
    QualityCheckPolicy.assertChecklistWhenAccepting(false, false, false, false, false, false);
    QualityCheckPolicy.assertChecklistWhenAccepting(true, true, true, true, true, true);
    assertThatThrownBy(
            () ->
                QualityCheckPolicy.assertChecklistWhenAccepting(
                    true, false, true, true, true, true))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(QualityCheckPolicy.CHECKLIST_INCOMPLETE);
    assertThatThrownBy(
            () ->
                QualityCheckPolicy.assertChecklistWhenAccepting(
                    true, true, true, true, true, false))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(QualityCheckPolicy.CHECKLIST_INCOMPLETE);
  }

  @Test
  void ac03_acceptedPlusRejectedMustEqualReceived() {
    QualityCheckPolicy.assertQuantities(
        new BigDecimal("10"), new BigDecimal("6"), new BigDecimal("4"));
    QualityCheckPolicy.assertQuantities(
        new BigDecimal("10"), BigDecimal.ZERO, new BigDecimal("10"));
    assertThatThrownBy(
            () ->
                QualityCheckPolicy.assertQuantities(
                    new BigDecimal("10"), new BigDecimal("6"), new BigDecimal("3")))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(QualityCheckPolicy.QUANTITY_MISMATCH);
    assertThatThrownBy(
            () ->
                QualityCheckPolicy.assertQuantities(
                    new BigDecimal("10"), new BigDecimal("11"), BigDecimal.ZERO))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(QualityCheckPolicy.QUANTITY_MISMATCH);
    assertThatThrownBy(
            () ->
                QualityCheckPolicy.assertQuantities(
                    new BigDecimal("10"), new BigDecimal("-1"), new BigDecimal("11")))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(QualityCheckPolicy.QUANTITY_MISMATCH);
  }

  @Test
  void ac05_repeatedDecisionIsStale() {
    QualityCheckPolicy.assertPending(GoodsReceiptStatus.PENDING_QC);
    assertThatThrownBy(() -> QualityCheckPolicy.assertPending(GoodsReceiptStatus.CHECKED))
        .isInstanceOf(ApiException.class)
        .satisfies(
            ex -> {
              ApiException api = (ApiException) ex;
              assertCode(api, QualityCheckPolicy.STALE_STATE, HttpStatus.CONFLICT);
            });
  }

  @Test
  void ac05_pastOrMissingExpiryWhenAcceptingBatchStock() {
    LocalDate today = LocalDate.of(2026, 9, 5);
    QualityCheckPolicy.assertExpiry(false, true, null, today);
    QualityCheckPolicy.assertExpiry(true, true, LocalDate.of(2027, 1, 1), today);
    QualityCheckPolicy.assertExpiry(true, false, null, today);
    assertThatThrownBy(() -> QualityCheckPolicy.assertExpiry(true, true, null, today))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(QualityCheckPolicy.INVALID_EXPIRY);
    assertThatThrownBy(
            () -> QualityCheckPolicy.assertExpiry(true, true, LocalDate.of(2020, 1, 1), today))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(QualityCheckPolicy.INVALID_EXPIRY);
  }

  private static void assertCode(ApiException api, String code, HttpStatus status) {
    org.assertj.core.api.Assertions.assertThat(api.getCode()).isEqualTo(code);
    org.assertj.core.api.Assertions.assertThat(api.getStatus()).isEqualTo(status);
  }
}
