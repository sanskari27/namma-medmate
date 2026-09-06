package com.nammamedmate.server.domain;

import com.nammamedmate.server.shared.exception.ApiException;
import java.util.Locale;
import org.springframework.http.HttpStatus;

public final class FinanceAccessPolicy {

  public static final String ACCOUNTANT_CODE = "accountant";
  public static final String FORBIDDEN = "FORBIDDEN";
  public static final String CA_EXPORT_ACTION = "CA_EXPORT";
  public static final String FORMAT_PDF = "pdf";

  private FinanceAccessPolicy() {}

  public static boolean allows(AppUserRole role, boolean accountantDesk, boolean financeModule) {
    if (!financeModule) {
      return false;
    }
    if (role == AppUserRole.pharmacy_owner) {
      return true;
    }
    return role == AppUserRole.pharmacy_staff && accountantDesk;
  }

  public static void requireAllowed(
      AppUserRole role, boolean accountantDesk, boolean financeModule) {
    if (!allows(role, accountantDesk, financeModule)) {
      throw forbidden();
    }
  }

  public static String requirePdf(String format) {
    String kind =
        format == null || format.isBlank() ? FORMAT_PDF : format.trim().toLowerCase(Locale.ROOT);
    if (FORMAT_PDF.equals(kind)) {
      return kind;
    }
    throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
  }

  public static ApiException forbidden() {
    return new ApiException(HttpStatus.FORBIDDEN, FORBIDDEN, "Forbidden");
  }
}
