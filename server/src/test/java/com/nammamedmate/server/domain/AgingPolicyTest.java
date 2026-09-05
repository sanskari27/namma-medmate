package com.nammamedmate.server.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.nammamedmate.server.shared.exception.ApiException;
import java.time.Instant;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class AgingPolicyTest {

  private static final LocalDate AS_OF = LocalDate.of(2026, 9, 6);

  @Test
  void ac02_bucketsAre0to30_31to60_61to90_and90Plus() {
    assertThat(AgingPolicy.bucket(0)).isEqualTo(AgingBucket.D0_30);
    assertThat(AgingPolicy.bucket(30)).isEqualTo(AgingBucket.D0_30);
    assertThat(AgingPolicy.bucket(31)).isEqualTo(AgingBucket.D31_60);
    assertThat(AgingPolicy.bucket(60)).isEqualTo(AgingBucket.D31_60);
    assertThat(AgingPolicy.bucket(61)).isEqualTo(AgingBucket.D61_90);
    assertThat(AgingPolicy.bucket(90)).isEqualTo(AgingBucket.D61_90);
    assertThat(AgingPolicy.bucket(91)).isEqualTo(AgingBucket.D90_PLUS);
    assertThat(AgingPolicy.days(AS_OF, LocalDate.of(2026, 9, 1))).isEqualTo(5);
    assertThat(AgingPolicy.days(AS_OF, LocalDate.of(2026, 8, 1))).isEqualTo(36);
    assertThat(AgingPolicy.days(AS_OF, LocalDate.of(2026, 7, 1))).isEqualTo(67);
    assertThat(AgingPolicy.days(AS_OF, LocalDate.of(2026, 5, 1))).isEqualTo(128);
    assertThat(AgingPolicy.bucket(AgingPolicy.days(AS_OF, LocalDate.of(2026, 9, 6))))
        .isEqualTo(AgingBucket.D0_30);
    assertThat(AgingPolicy.orderedBuckets())
        .containsExactly(
            AgingBucket.D0_30, AgingBucket.D31_60, AgingBucket.D61_90, AgingBucket.D90_PLUS);
  }

  @Test
  void ac03_cutoffIsEndOfIstDay() {
    Instant cutoff = AgingPolicy.cutoff(AS_OF);
    assertThat(AgingPolicy.istDate(cutoff)).isEqualTo(AS_OF);
    assertThat(AgingPolicy.istDate(cutoff.plusNanos(1))).isEqualTo(AS_OF.plusDays(1));
    assertThat(AgingPolicy.istDate(Instant.parse("2026-09-06T18:29:59Z"))).isEqualTo(AS_OF);
    assertThat(AgingPolicy.istDate(Instant.parse("2026-09-06T18:30:00Z")))
        .isEqualTo(AS_OF.plusDays(1));
  }

  @Test
  void ac05_futureAsOfIsRejected() {
    assertThat(AgingPolicy.requireAsOf(null, AS_OF)).isEqualTo(AS_OF);
    assertThat(AgingPolicy.requireAsOf(AS_OF, AS_OF)).isEqualTo(AS_OF);
    assertThatThrownBy(() -> AgingPolicy.requireAsOf(AS_OF.plusDays(1), AS_OF))
        .isInstanceOf(ApiException.class)
        .satisfies(
            ex -> {
              ApiException error = (ApiException) ex;
              assertThat(error.getStatus()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
              assertThat(error.getCode()).isEqualTo(AgingPolicy.FUTURE_AS_OF);
            });
  }

  @Test
  void ac05_missingDueDateAgesFromOccurredDate() {
    Instant occurred = Instant.parse("2026-05-01T06:00:00Z");
    LocalDate occurredIst = AgingPolicy.istDate(occurred);
    assertThat(AgingPolicy.ageOn(null, occurred)).isEqualTo(occurredIst);
    assertThat(AgingPolicy.ageOn(LocalDate.of(2026, 9, 1), occurred))
        .isEqualTo(LocalDate.of(2026, 9, 1));
    assertThat(AgingPolicy.days(AS_OF, AgingPolicy.ageOn(null, occurred))).isEqualTo(128);
    assertThat(AgingPolicy.bucket(AgingPolicy.days(AS_OF, AgingPolicy.ageOn(null, occurred))))
        .isEqualTo(AgingBucket.D90_PLUS);
    assertThat(AgingPolicy.days(AS_OF, AS_OF.plusDays(10))).isZero();
  }
}
