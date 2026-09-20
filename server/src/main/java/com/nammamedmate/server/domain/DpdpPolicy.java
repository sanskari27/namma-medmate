package com.nammamedmate.server.domain;

import java.time.Duration;
import java.util.List;
import java.util.Set;
import java.util.UUID;

public final class DpdpPolicy {

  public static final Duration DECISION_DEADLINE = Duration.ofDays(30);
  public static final String ERASED_NAME = "Erased principal";
  public static final String AUDIT_ACTION = "DPDP_REQUEST";

  public static final Set<DpdpPrincipalType> TENANT_TYPES =
      Set.of(
          DpdpPrincipalType.CUSTOMER,
          DpdpPrincipalType.STAFF,
          DpdpPrincipalType.DOCTOR,
          DpdpPrincipalType.SUPPLIER);
  public static final Set<DpdpPrincipalType> PLATFORM_TYPES =
      Set.of(DpdpPrincipalType.MASTER, DpdpPrincipalType.OWNER_KYC);

  private DpdpPolicy() {}

  public static List<DpdpCategory> matrix() {
    return List.of(
        new DpdpCategory(
            "CUSTOMER",
            "Dispense, credit, GST, and shop communication",
            "OWNER",
            "Keep legal invoice/NDPS/audit facts; blank optional CRM; placeholder name/phone if unused on legal records",
            "Profile fields plus related invoice/register ids",
            "Pharmacy OWNER"),
        new DpdpCategory(
            "STAFF",
            "Pharmacy login and till work",
            "OWNER",
            "Deactivate, revoke sessions/devices, blank optional fields, keep user id on audit/approvals",
            "Profile fields without secrets",
            "Pharmacy OWNER"),
        new DpdpCategory(
            "DOCTOR",
            "Prescriber reference on sales",
            "OWNER",
            "Blank optional contact; keep name if cited on a posted invoice",
            "Name, phone, registration",
            "Pharmacy OWNER"),
        new DpdpCategory(
            "SUPPLIER",
            "Procurement contact for the shop",
            "OWNER",
            "Placeholder contact person/phone; keep legal_name/GSTIN",
            "Contact name, phone, email — no bank numbers",
            "Pharmacy OWNER"),
        new DpdpCategory(
            "OWNER_KYC",
            "SaaS onboarding and pharmacy KYC",
            "MASTER",
            "Keep KYC evidence files; blank optional account fields",
            "Owner profile plus KYC document ids (not file bytes)",
            "Namma MedMate"),
        new DpdpCategory(
            "MASTER",
            "Platform operator accounts",
            "MASTER",
            "Deactivate, revoke sessions/devices, blank optional fields, keep user id",
            "Profile fields without secrets",
            "Namma MedMate"));
  }

  public static String erasedPhone(UUID id) {
    String hex = id.toString().replace("-", "");
    return "E" + hex.substring(0, 15);
  }
}
