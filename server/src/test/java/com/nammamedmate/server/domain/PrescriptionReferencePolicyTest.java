package com.nammamedmate.server.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.nammamedmate.server.shared.exception.ApiException;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class PrescriptionReferencePolicyTest {

  private static final Instant ISSUED = Instant.parse("2026-03-06T07:00:00Z");

  @Test
  void ac03_validityIsSixCalendarMonthsFromIssuedAt() {
    Instant expires = PrescriptionReferencePolicy.expiresAt(ISSUED);
    assertThat(expires).isEqualTo(Instant.parse("2026-09-06T07:00:00Z"));
    assertThat(PrescriptionReferencePolicy.expired(Instant.parse("2026-09-06T06:59:59Z"), expires))
        .isFalse();
    assertThat(PrescriptionReferencePolicy.expired(expires, expires)).isTrue();
    assertThat(PrescriptionReferencePolicy.expired(Instant.parse("2026-09-06T07:00:01Z"), expires))
        .isTrue();
  }

  @Test
  void ac03_eligibleWhenExpiredOrFullyFilledOtherwisePremature() {
    Instant expires = PrescriptionReferencePolicy.expiresAt(ISSUED);
    Instant before = Instant.parse("2026-04-01T00:00:00Z");
    assertThat(
            PrescriptionReferencePolicy.eligibleToArchive(before, expires, true, BigDecimal.ZERO))
        .isTrue();
    assertThat(PrescriptionReferencePolicy.archiveReason(before, expires, true, BigDecimal.ZERO))
        .isEqualTo(PrescriptionReferenceArchiveReason.FULFILLED);
    assertThat(
            PrescriptionReferencePolicy.eligibleToArchive(
                expires, expires, true, new BigDecimal("30")))
        .isTrue();
    assertThat(
            PrescriptionReferencePolicy.archiveReason(expires, expires, true, new BigDecimal("30")))
        .isEqualTo(PrescriptionReferenceArchiveReason.EXPIRED);
    assertThat(
            PrescriptionReferencePolicy.eligibleToArchive(
                before, expires, true, new BigDecimal("30")))
        .isFalse();
    assertThatThrownBy(
            () ->
                PrescriptionReferencePolicy.requireEligible(
                    before, expires, true, new BigDecimal("30")))
        .isInstanceOf(ApiException.class)
        .satisfies(
            ex -> {
              ApiException api = (ApiException) ex;
              assertThat(api.getStatus()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
              assertThat(api.getCode()).isEqualTo(PrescriptionReferencePolicy.PREMATURE_ARCHIVE);
            });
  }

  @Test
  void ac05_archivedCannotBeSelectedAndReactivationIsForbidden() {
    PrescriptionReferencePolicy.assertSelectable(PrescriptionReferenceStatus.ACTIVE);
    assertThatThrownBy(
            () ->
                PrescriptionReferencePolicy.assertSelectable(PrescriptionReferenceStatus.ARCHIVED))
        .isInstanceOf(ApiException.class)
        .satisfies(
            ex -> {
              ApiException api = (ApiException) ex;
              assertThat(api.getStatus()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
              assertThat(api.getCode()).isEqualTo(PrescriptionReferencePolicy.ARCHIVED_REFERENCE);
            });
    assertThatThrownBy(PrescriptionReferencePolicy::assertCannotReactivate)
        .isInstanceOf(ApiException.class)
        .satisfies(
            ex -> {
              ApiException api = (ApiException) ex;
              assertThat(api.getStatus()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
              assertThat(api.getCode())
                  .isEqualTo(PrescriptionReferencePolicy.REACTIVATION_FORBIDDEN);
            });
  }

  @Test
  void ac05_staleExpectedVersionIsConflict() {
    PrescriptionReferencePolicy.assertVersion(1, 1);
    PrescriptionReferencePolicy.assertVersion(1, null);
    assertThatThrownBy(() -> PrescriptionReferencePolicy.assertVersion(2, 1))
        .isInstanceOf(ApiException.class)
        .satisfies(
            ex -> {
              ApiException api = (ApiException) ex;
              assertThat(api.getStatus()).isEqualTo(HttpStatus.CONFLICT);
              assertThat(api.getCode()).isEqualTo(PrescriptionReferencePolicy.STALE_STATE);
            });
  }

  @Test
  void ac03_expiresAtUsesUtcCalendarMonthsNotFixedDays() {
    Instant issued = Instant.parse("2025-08-31T12:00:00Z");
    Instant expires = PrescriptionReferencePolicy.expiresAt(issued);
    assertThat(expires.atOffset(ZoneOffset.UTC).getMonthValue()).isEqualTo(2);
    assertThat(expires.atOffset(ZoneOffset.UTC).getYear()).isEqualTo(2026);
  }
}
