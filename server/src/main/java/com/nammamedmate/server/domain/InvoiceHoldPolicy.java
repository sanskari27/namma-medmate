package com.nammamedmate.server.domain;

import com.nammamedmate.server.shared.exception.ApiException;
import org.springframework.http.HttpStatus;

public final class InvoiceHoldPolicy {

  private InvoiceHoldPolicy() {}

  public static void assertCanHold(SalesInvoiceStatus status) {
    if (status != SalesInvoiceStatus.DRAFT) {
      throw stale("This bill cannot be held.");
    }
  }

  public static void assertCanResume(SalesInvoiceStatus status) {
    if (status != SalesInvoiceStatus.HELD) {
      throw stale("Resume a held bill from the held list.");
    }
  }

  public static void assertCompletable(SalesInvoiceStatus status) {
    if (status != SalesInvoiceStatus.DRAFT && status != SalesInvoiceStatus.HELD) {
      throw stale("This bill was already collected.");
    }
  }

  public static void assertMutable(SalesInvoiceStatus status) {
    if (status != SalesInvoiceStatus.DRAFT) {
      throw stale("Resume this held bill before editing.");
    }
  }

  private static ApiException stale(String message) {
    return new ApiException(HttpStatus.CONFLICT, InvoicePolicy.STALE_STATE, message);
  }
}
