package com.nammamedmate.server.domain;

import com.nammamedmate.server.shared.exception.ApiException;
import java.util.Locale;
import java.util.UUID;
import org.springframework.http.HttpStatus;

public final class InvoiceHospitalSalePolicy {

  public static final String UHID_REQUIRED = "UHID_REQUIRED";
  public static final String UHID_REQUIRED_MESSAGE = "Ward and emergency bills need a patient ID.";
  public static final String WARD_REQUIRED = "WARD_REQUIRED";
  public static final String WARD_REQUIRED_MESSAGE = "Ward bills need a ward.";
  public static final String ADMISSION_DISCHARGED = "ADMISSION_DISCHARGED";
  public static final String ADMISSION_DISCHARGED_MESSAGE =
      "This patient is discharged. Open a new stay before a ward bill.";
  public static final String WARD_MISMATCH = "WARD_MISMATCH";
  public static final String WARD_MISMATCH_MESSAGE =
      "This patient ID is admitted on a different ward.";
  public static final String TPA_INCOMPLETE = HospitalPolicy.TPA_INCOMPLETE;
  public static final String TPA_INCOMPLETE_MESSAGE =
      "Insurance/TPA needs insurer name and policy number.";

  private InvoiceHospitalSalePolicy() {}

  public static InvoiceSaleSource parseSource(String raw) {
    if (raw == null || raw.isBlank()) {
      return InvoiceSaleSource.COUNTER;
    }
    try {
      return InvoiceSaleSource.valueOf(raw.trim().toUpperCase(Locale.ROOT));
    } catch (RuntimeException ex) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
  }

  public static boolean requiresHospitalModule(InvoiceSaleSource source) {
    return source != null && source != InvoiceSaleSource.COUNTER;
  }

  public static void assertHospitalAccess(
      InvoiceSaleSource source, PlanCode plan, boolean hasHospital) {
    if (!requiresHospitalModule(source)) {
      return;
    }
    HospitalPolicy.assertEntitled(plan);
    HospitalPolicy.requireHospitalModule(hasHospital);
  }

  public static String requireUhid(InvoiceSaleSource source, String uhid) {
    String trimmed = trimToNull(uhid);
    if (source == InvoiceSaleSource.WARD || source == InvoiceSaleSource.EMERGENCY) {
      if (trimmed == null) {
        throw new ApiException(
            HttpStatus.UNPROCESSABLE_ENTITY, UHID_REQUIRED, UHID_REQUIRED_MESSAGE);
      }
    }
    return trimmed;
  }

  public static UUID requireWard(InvoiceSaleSource source, UUID wardId) {
    if (source == InvoiceSaleSource.WARD && wardId == null) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, WARD_REQUIRED, WARD_REQUIRED_MESSAGE);
    }
    return wardId;
  }

  public static void assertActiveWardAdmission(HospitalAdmission admission, UUID wardId) {
    if (admission == null) {
      throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Not found");
    }
    if (admission.getStatus() == HospitalAdmissionStatus.DISCHARGED) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY, ADMISSION_DISCHARGED, ADMISSION_DISCHARGED_MESSAGE);
    }
    if (wardId != null && !wardId.equals(admission.getWardId())) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, WARD_MISMATCH, WARD_MISMATCH_MESSAGE);
    }
  }

  public static void assertInsuranceTender(
      boolean insuranceUsed, String insurerName, String policyNumber) {
    if (!insuranceUsed) {
      return;
    }
    if (trimToNull(insurerName) == null || trimToNull(policyNumber) == null) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY, TPA_INCOMPLETE, TPA_INCOMPLETE_MESSAGE);
    }
  }

  public static String trimToNull(String value) {
    if (value == null || value.isBlank()) {
      return null;
    }
    return value.trim();
  }
}
