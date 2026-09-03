package com.nammamedmate.server.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.LinkedHashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;

class BranchCodeGeneratorTest {

  @Test
  void generatesSequentialCodes() {
    assertThat(BranchCodeGenerator.nextCode(0)).isEqualTo("BR01");
    assertThat(BranchCodeGenerator.nextCode(1)).isEqualTo("BR02");
    assertThat(BranchCodeGenerator.nextCode(9)).isEqualTo("BR10");
  }

  @Test
  void rejectsOutOfRange() {
    assertThatThrownBy(() -> BranchCodeGenerator.nextCode(99))
        .isInstanceOf(IllegalArgumentException.class);
  }
}

class OperatingHoursValidatorTest {

  @Test
  void acceptsValidDaySlots() {
    Map<String, Object> hours = new LinkedHashMap<>();
    Map<String, Object> mon = new LinkedHashMap<>();
    mon.put("open", "09:00");
    mon.put("close", "21:00");
    hours.put("mon", mon);
    Map<String, Object> sun = new LinkedHashMap<>();
    sun.put("closed", true);
    hours.put("sun", sun);
    assertThat(OperatingHoursValidator.isValid(hours)).isTrue();
  }

  @Test
  void rejectsInvalidCloseBeforeOpen() {
    Map<String, Object> hours = new LinkedHashMap<>();
    Map<String, Object> mon = new LinkedHashMap<>();
    mon.put("open", "21:00");
    mon.put("close", "09:00");
    hours.put("mon", mon);
    assertThat(OperatingHoursValidator.isValid(hours)).isFalse();
  }

  @Test
  void rejectsUnknownDay() {
    Map<String, Object> hours = new LinkedHashMap<>();
    hours.put("monday", Map.of("open", "09:00", "close", "10:00"));
    assertThat(OperatingHoursValidator.isValid(hours)).isFalse();
  }
}

class BranchSettingsSnapshotTest {

  @Test
  void copiesNestedMapsIndependently() {
    Map<String, Object> nested = new LinkedHashMap<>();
    nested.put("defaultMarkupBps", 500);
    Map<String, Object> source = new LinkedHashMap<>();
    source.put("pricing", nested);

    Map<String, Object> copy = BranchSettingsSnapshot.copy(source);
    @SuppressWarnings("unchecked")
    Map<String, Object> copiedNested = (Map<String, Object>) copy.get("pricing");
    copiedNested.put("defaultMarkupBps", 999);

    assertThat(nested.get("defaultMarkupBps")).isEqualTo(500);
    assertThat(copiedNested.get("defaultMarkupBps")).isEqualTo(999);
  }
}
