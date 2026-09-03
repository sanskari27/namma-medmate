package com.nammamedmate.server.application.customer;

import com.nammamedmate.server.domain.Customer;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

final class CustomerMergeFields {

  enum Side {
    SURVIVOR,
    DUPLICATE
  }

  enum Status {
    SAME,
    SURVIVOR_ONLY,
    DUPLICATE_ONLY,
    CONFLICT
  }

  record FieldDiff(String field, Status status, String survivorValue, String duplicateValue) {}

  private CustomerMergeFields() {}

  static List<FieldDiff> diff(Customer survivor, Customer duplicate) {
    List<FieldDiff> fields = new ArrayList<>();
    fields.add(diffString("name", survivor.getName(), duplicate.getName()));
    fields.add(diffString("phone", survivor.getPhone(), duplicate.getPhone()));
    fields.add(diffString("email", survivor.getEmail(), duplicate.getEmail()));
    fields.add(diffDate("dateOfBirth", survivor.getDateOfBirth(), duplicate.getDateOfBirth()));
    fields.add(diffString("gender", survivor.getGender(), duplicate.getGender()));
    fields.add(diffString("address", survivor.getAddress(), duplicate.getAddress()));
    fields.add(diffString("bloodGroup", survivor.getBloodGroup(), duplicate.getBloodGroup()));
    fields.add(diffString("allergies", survivor.getAllergies(), duplicate.getAllergies()));
    fields.add(
        diffString(
            "chronicConditions",
            survivor.getChronicConditions(),
            duplicate.getChronicConditions()));
    return fields;
  }

  static List<String> conflicts(List<FieldDiff> fields) {
    return fields.stream()
        .filter(field -> field.status() == Status.CONFLICT)
        .map(FieldDiff::field)
        .toList();
  }

  static Map<String, String> resolveValues(
      Customer survivor, Customer duplicate, Map<String, Side> resolutions) {
    Map<String, String> values = new LinkedHashMap<>();
    for (FieldDiff field : diff(survivor, duplicate)) {
      String chosen =
          switch (field.status()) {
            case SAME, SURVIVOR_ONLY -> field.survivorValue();
            case DUPLICATE_ONLY -> field.duplicateValue();
            case CONFLICT -> {
              Side side = resolutions.get(field.field());
              if (side == null) {
                throw new IllegalArgumentException(field.field());
              }
              yield side == Side.SURVIVOR ? field.survivorValue() : field.duplicateValue();
            }
          };
      values.put(field.field(), chosen);
    }
    return values;
  }

  static Side parseSide(String raw) {
    if (raw == null || raw.isBlank()) {
      return null;
    }
    try {
      return Side.valueOf(raw.trim().toUpperCase(Locale.ROOT));
    } catch (IllegalArgumentException ex) {
      return null;
    }
  }

  private static FieldDiff diffString(String field, String survivor, String duplicate) {
    String left = normalize(survivor);
    String right = normalize(duplicate);
    return new FieldDiff(field, status(left, right), left, right);
  }

  private static FieldDiff diffDate(String field, LocalDate survivor, LocalDate duplicate) {
    String left = survivor == null ? null : survivor.toString();
    String right = duplicate == null ? null : duplicate.toString();
    return new FieldDiff(field, status(left, right), left, right);
  }

  private static Status status(String left, String right) {
    if (Objects.equals(left, right)) {
      return Status.SAME;
    }
    if (left == null) {
      return Status.DUPLICATE_ONLY;
    }
    if (right == null) {
      return Status.SURVIVOR_ONLY;
    }
    return Status.CONFLICT;
  }

  private static String normalize(String value) {
    if (value == null || value.isBlank()) {
      return null;
    }
    return value.trim();
  }
}
