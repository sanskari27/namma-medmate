package com.nammamedmate.server.application.medicationsafety;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

final class MedicationSafetyMatcher {

  private static final Pattern ALLERGEN_SPLIT = Pattern.compile("[,;\\n\\r]+");
  private static final Pattern WHITESPACE = Pattern.compile("\\s+");

  private MedicationSafetyMatcher() {}

  static List<String> allergenTokens(String allergies) {
    if (allergies == null || allergies.isBlank()) {
      return List.of();
    }
    List<String> tokens = new ArrayList<>();
    for (String part : ALLERGEN_SPLIT.split(allergies)) {
      String normalized = normalize(part);
      if (normalized.length() >= 2) {
        tokens.add(part.trim());
      }
    }
    return tokens;
  }

  static String normalize(String value) {
    if (value == null) {
      return "";
    }
    return WHITESPACE.matcher(value.trim().toLowerCase(Locale.ROOT)).replaceAll(" ");
  }

  static MatchResult matchAllergy(
      String allergenDisplay, com.nammamedmate.server.domain.Product product) {
    String needle = normalize(allergenDisplay);
    if (needle.isEmpty()) {
      return null;
    }
    List<FieldCandidate> fields =
        List.of(
            new FieldCandidate("name", product.getName()),
            new FieldCandidate("genericName", product.getGenericName()),
            new FieldCandidate("brandName", product.getBrandName()),
            new FieldCandidate("composition", product.getComposition()));
    for (FieldCandidate field : fields) {
      String haystack = normalize(field.value());
      if (!haystack.isEmpty() && haystack.contains(needle)) {
        return new MatchResult(allergenDisplay.trim(), field.name());
      }
    }
    return null;
  }

  static boolean hasMatchableIdentity(com.nammamedmate.server.domain.Product product) {
    return notBlank(product.getName())
        || notBlank(product.getGenericName())
        || notBlank(product.getBrandName())
        || notBlank(product.getComposition());
  }

  static boolean hasComposition(com.nammamedmate.server.domain.Product product) {
    return notBlank(product.getComposition());
  }

  static Map<String, List<UUID>> groupByNormalizedComposition(
      List<com.nammamedmate.server.domain.Product> products) {
    Map<String, List<UUID>> groups = new LinkedHashMap<>();
    Map<String, String> displayByNorm = new LinkedHashMap<>();
    for (com.nammamedmate.server.domain.Product product : products) {
      if (!hasComposition(product)) {
        continue;
      }
      String display = product.getComposition().trim();
      String norm = normalize(display);
      displayByNorm.putIfAbsent(norm, display);
      groups.computeIfAbsent(norm, key -> new ArrayList<>()).add(product.getId());
    }
    Map<String, List<UUID>> duplicates = new LinkedHashMap<>();
    for (Map.Entry<String, List<UUID>> entry : groups.entrySet()) {
      if (entry.getValue().size() >= 2) {
        duplicates.put(displayByNorm.get(entry.getKey()), List.copyOf(entry.getValue()));
      }
    }
    return duplicates;
  }

  static Set<String> uniqueSorted(List<String> values) {
    return values.stream().collect(Collectors.toCollection(LinkedHashSet::new));
  }

  static String warningKeyAllergy(UUID customerId, UUID productId, String allergen) {
    return "ALLERGY:" + customerId + ":" + productId + ":" + normalize(allergen);
  }

  static String warningKeyDuplicate(String composition, List<UUID> productIds) {
    String ids = productIds.stream().map(UUID::toString).sorted().collect(Collectors.joining(","));
    return "DUPLICATE_COMPOSITION:" + normalize(composition) + ":" + ids;
  }

  private static boolean notBlank(String value) {
    return value != null && !value.isBlank();
  }

  record MatchResult(String matchedAllergen, String matchedField) {}

  private record FieldCandidate(String name, String value) {}
}
