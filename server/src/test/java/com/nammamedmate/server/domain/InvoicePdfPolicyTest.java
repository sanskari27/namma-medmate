package com.nammamedmate.server.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.nammamedmate.server.shared.exception.ApiException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class InvoicePdfPolicyTest {

  @Test
  void ac01_completedInvoiceMayProducePdf() {
    InvoicePdfPolicy.assertCompleted(SalesInvoiceStatus.COMPLETED);
  }

  @Test
  void ac01_draftAndHeldCannotProducePdf() {
    assertThatThrownBy(() -> InvoicePdfPolicy.assertCompleted(SalesInvoiceStatus.DRAFT))
        .isInstanceOf(ApiException.class)
        .satisfies(ex -> assertUnprocessable((ApiException) ex, InvoicePdfPolicy.NOT_COMPLETED));
    assertThatThrownBy(() -> InvoicePdfPolicy.assertCompleted(SalesInvoiceStatus.HELD))
        .isInstanceOf(ApiException.class)
        .satisfies(ex -> assertUnprocessable((ApiException) ex, InvoicePdfPolicy.NOT_COMPLETED));
  }

  @Test
  void ac02_pageSizeIsA4NotThermal() {
    assertThat(InvoicePdfPolicy.isA4(595f, 842f)).isTrue();
    assertThat(InvoicePdfPolicy.isA4(226f, 841f)).isFalse();
    assertThat(InvoicePdfPolicy.A4_WIDTH_POINTS).isEqualTo(595f);
    assertThat(InvoicePdfPolicy.A4_HEIGHT_POINTS).isEqualTo(842f);
  }

  private static void assertUnprocessable(ApiException api, String code) {
    assertThat(api.getCode()).isEqualTo(code);
    assertThat(api.getStatus()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
  }
}
