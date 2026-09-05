package com.nammamedmate.server.domain;

import com.nammamedmate.server.shared.exception.ApiException;
import java.util.UUID;
import org.springframework.http.HttpStatus;

public final class InvoiceCopyPolicy {

  public static final String CUSTOMER_EMAIL_REQUIRED = "CUSTOMER_EMAIL_REQUIRED";
  public static final String NOT_COMPLETED = InvoicePdfPolicy.NOT_COMPLETED;

  private InvoiceCopyPolicy() {}

  public static void assertCompleted(SalesInvoiceStatus status) {
    InvoicePdfPolicy.assertCompleted(status);
  }

  public static String requireCustomerEmail(String email) {
    if (email == null || email.isBlank()) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          CUSTOMER_EMAIL_REQUIRED,
          "This patient has no email on file. Add one before sending a bill copy.");
    }
    return email.trim();
  }

  public static String idempotencyKey(UUID invoiceId) {
    return "invoice-copy:" + invoiceId;
  }
}
