package com.nammamedmate.server.domain;

import java.text.Normalizer;
import java.util.Locale;

public final class TenantSlug {

  private static final int MAX_LENGTH = 100;

  private TenantSlug() {}

  public static String fromBusinessName(String businessName) {
    if (businessName == null || businessName.isBlank()) {
      return "pharmacy";
    }
    String normalized =
        Normalizer.normalize(businessName.trim(), Normalizer.Form.NFKD)
            .replaceAll("\\p{M}+", "")
            .toLowerCase(Locale.ROOT)
            .replaceAll("[^a-z0-9]+", "-")
            .replaceAll("^-+|-+$", "");
    if (normalized.isEmpty()) {
      normalized = "pharmacy";
    }
    if (normalized.length() > MAX_LENGTH) {
      normalized = normalized.substring(0, MAX_LENGTH).replaceAll("-+$", "");
    }
    return normalized.isEmpty() ? "pharmacy" : normalized;
  }
}
