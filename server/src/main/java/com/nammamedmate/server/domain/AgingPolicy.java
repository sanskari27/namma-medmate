package com.nammamedmate.server.domain;

import com.nammamedmate.server.shared.exception.ApiException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.List;
import org.springframework.http.HttpStatus;

public final class AgingPolicy {

  public static final ZoneId IST = ZoneId.of("Asia/Kolkata");
  public static final String FUTURE_AS_OF = "FUTURE_AS_OF";
  public static final String FORBIDDEN = "FORBIDDEN";
  public static final String NOT_FOUND = "NOT_FOUND";
  public static final String NO_ACTIVE_BRANCH = "NO_ACTIVE_BRANCH";

  private AgingPolicy() {}

  public static List<AgingBucket> orderedBuckets() {
    return List.of(AgingBucket.D0_30, AgingBucket.D31_60, AgingBucket.D61_90, AgingBucket.D90_PLUS);
  }

  public static LocalDate today(Instant now) {
    return now.atZone(IST).toLocalDate();
  }

  public static LocalDate requireAsOf(LocalDate asOf, LocalDate today) {
    if (asOf == null) {
      return today;
    }
    if (asOf.isAfter(today)) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY, FUTURE_AS_OF, "As-of date must be today or earlier.");
    }
    return asOf;
  }

  public static Instant cutoff(LocalDate asOf) {
    return asOf.atTime(LocalTime.MAX).atZone(IST).toInstant();
  }

  public static LocalDate istDate(Instant instant) {
    return instant.atZone(IST).toLocalDate();
  }

  public static LocalDate ageOn(LocalDate dueOn, Instant occurredAt) {
    if (dueOn != null) {
      return dueOn;
    }
    return istDate(occurredAt);
  }

  public static int days(LocalDate asOf, LocalDate ageOn) {
    long days = ChronoUnit.DAYS.between(ageOn, asOf);
    if (days < 0) {
      return 0;
    }
    if (days > Integer.MAX_VALUE) {
      return Integer.MAX_VALUE;
    }
    return (int) days;
  }

  public static AgingBucket bucket(int days) {
    if (days <= 30) {
      return AgingBucket.D0_30;
    }
    if (days <= 60) {
      return AgingBucket.D31_60;
    }
    if (days <= 90) {
      return AgingBucket.D61_90;
    }
    return AgingBucket.D90_PLUS;
  }

  public static ApiException forbidden() {
    return new ApiException(HttpStatus.FORBIDDEN, FORBIDDEN, "Forbidden");
  }

  public static ApiException notFound() {
    return new ApiException(HttpStatus.NOT_FOUND, NOT_FOUND, "Not found.");
  }

  public static ApiException noActiveBranch() {
    return new ApiException(
        HttpStatus.UNPROCESSABLE_ENTITY, NO_ACTIVE_BRANCH, "Select an outlet before opening dues.");
  }

  public static ApiException shape() {
    return new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
  }
}
