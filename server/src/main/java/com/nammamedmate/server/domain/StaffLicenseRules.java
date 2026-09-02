package com.nammamedmate.server.domain;

public final class StaffLicenseRules {

  private StaffLicenseRules() {}

  public static boolean valid(StaffRegistrationKind kind, String licenseNumber) {
    if (kind == StaffRegistrationKind.PHARMACIST) {
      return !blank(licenseNumber);
    }
    return true;
  }

  public static String normalized(String licenseNumber) {
    if (blank(licenseNumber)) {
      return null;
    }
    return licenseNumber.trim();
  }

  private static boolean blank(String value) {
    return value == null || value.trim().isEmpty();
  }
}
