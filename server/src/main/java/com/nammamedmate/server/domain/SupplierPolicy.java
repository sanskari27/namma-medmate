package com.nammamedmate.server.domain;

import com.nammamedmate.server.shared.exception.ApiException;
import java.time.LocalDate;
import java.util.Locale;
import java.util.regex.Pattern;
import org.springframework.http.HttpStatus;

public final class SupplierPolicy {

  public static final String CODE_TAKEN = "CODE_TAKEN";
  public static final String GSTIN_TAKEN = "GSTIN_TAKEN";
  public static final String LICENSE_DATE_INVALID = "LICENSE_DATE_INVALID";
  public static final String UNSAFE_BANK_UPDATE = "UNSAFE_BANK_UPDATE";

  static final String GSTIN_PATTERN = "^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$";
  static final String PAN_PATTERN = "^[A-Z]{5}[0-9]{4}[A-Z]$";
  static final String IFSC_PATTERN = "^[A-Z]{4}0[A-Z0-9]{6}$";
  static final String ACCOUNT_PATTERN = "^[0-9]{9,18}$";
  static final String UPI_PATTERN = "^[a-zA-Z0-9._-]{2,256}@[a-zA-Z]{2,64}$";
  static final String CODE_PATTERN = "^[A-Z0-9-]{3,32}$";
  static final String PINCODE_PATTERN = "^[1-9][0-9]{5}$";

  private static final Pattern GSTIN = Pattern.compile(GSTIN_PATTERN);
  private static final Pattern PAN = Pattern.compile(PAN_PATTERN);
  private static final Pattern IFSC = Pattern.compile(IFSC_PATTERN);
  private static final Pattern ACCOUNT = Pattern.compile(ACCOUNT_PATTERN);
  private static final Pattern UPI = Pattern.compile(UPI_PATTERN);
  private static final Pattern CODE = Pattern.compile(CODE_PATTERN);
  private static final Pattern PINCODE = Pattern.compile(PINCODE_PATTERN);

  private SupplierPolicy() {}

  public static String requireCode(String supplierCode) {
    String cleaned = required(supplierCode, "supplierCode").toUpperCase(Locale.ROOT);
    if (!CODE.matcher(cleaned).matches()) {
      throw shape();
    }
    return cleaned;
  }

  public static String requireLegalName(String legalName) {
    return required(legalName, "legalName");
  }

  public static String requireContactName(String contactPersonName) {
    return required(contactPersonName, "contactPersonName");
  }

  public static String requirePhone(String phone) {
    return required(phone, "phone");
  }

  public static String requireAddressLine1(String addressLine1) {
    return required(addressLine1, "addressLine1");
  }

  public static String requireCity(String city) {
    return required(city, "city");
  }

  public static String requireState(String state) {
    return required(state, "state");
  }

  public static String requireCountry(String country) {
    String cleaned = optional(country);
    return cleaned == null ? "India" : cleaned;
  }

  public static String requirePincode(String pincode) {
    String cleaned = required(pincode, "pincode");
    if (!PINCODE.matcher(cleaned).matches()) {
      throw shape();
    }
    return cleaned;
  }

  public static String optionalGstin(String gstin) {
    String cleaned = optional(gstin);
    if (cleaned == null) {
      return null;
    }
    String upper = cleaned.toUpperCase(Locale.ROOT);
    if (!GSTIN.matcher(upper).matches()) {
      throw shape();
    }
    return upper;
  }

  public static String optionalPan(String pan) {
    String cleaned = optional(pan);
    if (cleaned == null) {
      return null;
    }
    String upper = cleaned.toUpperCase(Locale.ROOT);
    if (!PAN.matcher(upper).matches()) {
      throw shape();
    }
    return upper;
  }

  public static String optional(String value) {
    if (value == null || value.isBlank()) {
      return null;
    }
    return value.trim();
  }

  public static Integer optionalCreditPeriodDays(Integer days) {
    if (days == null) {
      return null;
    }
    if (days < 0 || days > 365) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
    return days;
  }

  public static Long optionalCreditLimitPaise(Long paise) {
    if (paise == null) {
      return null;
    }
    if (paise < 0) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
    return paise;
  }

  public static void requireLicenseDates(
      String drugLicenseNumber, LocalDate expiry, SupplierStatus status, LocalDate today) {
    String number = optional(drugLicenseNumber);
    if (expiry != null && number == null) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          LICENSE_DATE_INVALID,
          "A drug license expiry needs a license number.");
    }
    if (expiry != null && expiry.getYear() < 1990) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          LICENSE_DATE_INVALID,
          "Drug license expiry is not a usable date.");
    }
    if (status == SupplierStatus.ACTIVE && expiry != null && expiry.isBefore(today)) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          LICENSE_DATE_INVALID,
          "An active supplier cannot keep an expired drug license.");
    }
  }

  public static SupplierLicenseStatus licenseStatus(
      String drugLicenseNumber, LocalDate expiry, LocalDate today) {
    String number = optional(drugLicenseNumber);
    if (number == null) {
      return SupplierLicenseStatus.MISSING;
    }
    if (expiry == null) {
      return SupplierLicenseStatus.VALID;
    }
    if (expiry.isBefore(today)) {
      return SupplierLicenseStatus.EXPIRED;
    }
    if (!expiry.isAfter(today.plusDays(30))) {
      return SupplierLicenseStatus.EXPIRING;
    }
    return SupplierLicenseStatus.VALID;
  }

  public static SupplierBankDetails requireBank(
      String bankName,
      String accountHolderName,
      String accountNumber,
      String confirmAccountNumber,
      String ifscCode,
      String upiId,
      String existingAccountNumber) {
    String name = optional(bankName);
    String holder = optional(accountHolderName);
    String account = digitsOnly(optional(accountNumber));
    String confirm = digitsOnly(optional(confirmAccountNumber));
    String ifsc = optional(ifscCode);
    if (ifsc != null) {
      ifsc = ifsc.toUpperCase(Locale.ROOT);
    }
    String upi = optional(upiId);

    boolean anyCore = name != null || holder != null || account != null || ifsc != null;
    if (!anyCore && upi == null) {
      return new SupplierBankDetails(null, null, null, null, null);
    }

    if (account == null || ifsc == null || holder == null || name == null) {
      throw unsafeBank();
    }
    if (!ACCOUNT.matcher(account).matches() || !IFSC.matcher(ifsc).matches()) {
      throw unsafeBank();
    }
    if (confirm == null || !confirm.equals(account)) {
      throw unsafeBank();
    }
    if (existingAccountNumber != null
        && !existingAccountNumber.equals(account)
        && !account.equals(confirm)) {
      throw unsafeBank();
    }
    if (upi != null && !UPI.matcher(upi).matches()) {
      throw unsafeBank();
    }
    return new SupplierBankDetails(name, holder, account, ifsc, upi);
  }

  public static ApiException codeTaken() {
    return new ApiException(
        HttpStatus.CONFLICT, CODE_TAKEN, "A supplier with this code already exists.");
  }

  public static ApiException gstinTaken() {
    return new ApiException(
        HttpStatus.CONFLICT, GSTIN_TAKEN, "A supplier with this GSTIN already exists.");
  }

  private static String digitsOnly(String value) {
    if (value == null) {
      return null;
    }
    return value.replaceAll("\\s", "");
  }

  private static String required(String value, String field) {
    String cleaned = optional(value);
    if (cleaned == null) {
      throw shape();
    }
    return cleaned;
  }

  private static ApiException shape() {
    return new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
  }

  private static ApiException unsafeBank() {
    return new ApiException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        UNSAFE_BANK_UPDATE,
        "Bank details must be a complete, confirmed account with a valid IFSC.");
  }
}
