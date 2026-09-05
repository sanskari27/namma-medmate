package com.nammamedmate.server.domain;

import com.nammamedmate.server.shared.exception.ApiException;
import org.springframework.http.HttpStatus;

public final class InvoicePdfPolicy {

  public static final String NOT_COMPLETED = "INVOICE_NOT_COMPLETED";
  public static final float A4_WIDTH_POINTS = 595f;
  public static final float A4_HEIGHT_POINTS = 842f;

  private InvoicePdfPolicy() {}

  public static void assertCompleted(SalesInvoiceStatus status) {
    if (status != SalesInvoiceStatus.COMPLETED) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          NOT_COMPLETED,
          "Collect this bill before printing the A4 invoice.");
    }
  }

  public static boolean isA4(float widthPoints, float heightPoints) {
    return Float.compare(widthPoints, A4_WIDTH_POINTS) == 0
        && Float.compare(heightPoints, A4_HEIGHT_POINTS) == 0;
  }
}
