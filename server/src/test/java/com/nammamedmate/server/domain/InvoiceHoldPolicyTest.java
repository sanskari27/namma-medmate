package com.nammamedmate.server.domain;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.nammamedmate.server.shared.exception.ApiException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class InvoiceHoldPolicyTest {

  @Test
  void ac01_onlyDraftCanHold() {
    assertThatCode(() -> InvoiceHoldPolicy.assertCanHold(SalesInvoiceStatus.DRAFT))
        .doesNotThrowAnyException();
    assertThatThrownBy(() -> InvoiceHoldPolicy.assertCanHold(SalesInvoiceStatus.HELD))
        .isInstanceOf(ApiException.class)
        .satisfies(ex -> assertStale((ApiException) ex));
    assertThatThrownBy(() -> InvoiceHoldPolicy.assertCanHold(SalesInvoiceStatus.COMPLETED))
        .isInstanceOf(ApiException.class)
        .satisfies(ex -> assertStale((ApiException) ex));
  }

  @Test
  void ac02_onlyHeldCanResume() {
    assertThatCode(() -> InvoiceHoldPolicy.assertCanResume(SalesInvoiceStatus.HELD))
        .doesNotThrowAnyException();
    assertThatThrownBy(() -> InvoiceHoldPolicy.assertCanResume(SalesInvoiceStatus.DRAFT))
        .isInstanceOf(ApiException.class)
        .satisfies(ex -> assertStale((ApiException) ex));
    assertThatThrownBy(() -> InvoiceHoldPolicy.assertCanResume(SalesInvoiceStatus.COMPLETED))
        .isInstanceOf(ApiException.class)
        .satisfies(ex -> assertStale((ApiException) ex));
  }

  @Test
  void ac03_draftOrHeldCanComplete() {
    assertThatCode(() -> InvoiceHoldPolicy.assertCompletable(SalesInvoiceStatus.DRAFT))
        .doesNotThrowAnyException();
    assertThatCode(() -> InvoiceHoldPolicy.assertCompletable(SalesInvoiceStatus.HELD))
        .doesNotThrowAnyException();
    assertThatThrownBy(() -> InvoiceHoldPolicy.assertCompletable(SalesInvoiceStatus.COMPLETED))
        .isInstanceOf(ApiException.class)
        .satisfies(ex -> assertStale((ApiException) ex));
  }

  @Test
  void ac06_heldInvoiceIsNotMutable() {
    assertThatCode(() -> InvoiceHoldPolicy.assertMutable(SalesInvoiceStatus.DRAFT))
        .doesNotThrowAnyException();
    assertThatThrownBy(() -> InvoiceHoldPolicy.assertMutable(SalesInvoiceStatus.HELD))
        .isInstanceOf(ApiException.class)
        .satisfies(ex -> assertStale((ApiException) ex));
    assertThatThrownBy(() -> InvoiceHoldPolicy.assertMutable(SalesInvoiceStatus.COMPLETED))
        .isInstanceOf(ApiException.class)
        .satisfies(ex -> assertStale((ApiException) ex));
  }

  private static void assertStale(ApiException api) {
    org.assertj.core.api.Assertions.assertThat(api.getStatus()).isEqualTo(HttpStatus.CONFLICT);
    org.assertj.core.api.Assertions.assertThat(api.getCode()).isEqualTo(InvoicePolicy.STALE_STATE);
  }
}
