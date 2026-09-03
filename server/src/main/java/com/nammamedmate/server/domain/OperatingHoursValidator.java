package com.nammamedmate.server.domain;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Map;
import java.util.Set;

public final class OperatingHoursValidator {

  private static final Set<String> DAYS = Set.of("mon", "tue", "wed", "thu", "fri", "sat", "sun");
  private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm");

  private OperatingHoursValidator() {}

  public static boolean isValid(Map<String, Object> hours) {
    if (hours == null) {
      return false;
    }
    for (Map.Entry<String, Object> entry : hours.entrySet()) {
      if (!DAYS.contains(entry.getKey())) {
        return false;
      }
      Object value = entry.getValue();
      if (value == null) {
        continue;
      }
      if (!(value instanceof Map<?, ?> day)) {
        return false;
      }
      if (Boolean.TRUE.equals(day.get("closed"))) {
        continue;
      }
      Object open = day.get("open");
      Object close = day.get("close");
      if (!(open instanceof String openText) || !(close instanceof String closeText)) {
        return false;
      }
      try {
        LocalTime openTime = LocalTime.parse(openText, TIME);
        LocalTime closeTime = LocalTime.parse(closeText, TIME);
        if (!closeTime.isAfter(openTime)) {
          return false;
        }
      } catch (DateTimeParseException ex) {
        return false;
      }
    }
    return true;
  }
}
