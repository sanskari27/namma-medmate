package com.nammamedmate.server.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.nammamedmate.server.shared.exception.ApiException;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class InvoicePaymentPolicyTest {

  @Test
  void ac01_supportedModesAreCashCardUpiCreditAndBankTransfer() {
    InvoicePaymentPolicy.Allocation allocation =
        InvoicePaymentPolicy.allocate(
            11200L,
            0L,
            List.of(
                part(PaymentMode.CASH, 2000L, null),
                part(PaymentMode.CARD, 2000L, "RRN-1"),
                part(PaymentMode.UPI, 2000L, "UPI-1"),
                part(PaymentMode.BANK_TRANSFER, 2000L, "NEFT-1"),
                part(PaymentMode.CREDIT, 3200L, null)));
    assertThat(allocation.amountPaidPaise()).isEqualTo(11200L);
    assertThat(allocation.amountDuePaise()).isEqualTo(3200L);
    assertThat(allocation.changePaise()).isEqualTo(0L);
    assertThat(allocation.parts()).hasSize(5);
  }

  @Test
  void ac02_cashOverpaySetsChangeAndKhataSetsDue() {
    InvoicePaymentPolicy.Allocation cash =
        InvoicePaymentPolicy.allocate(11200L, 800L, List.of(part(PaymentMode.CASH, 12000L, null)));
    assertThat(cash.amountPaidPaise()).isEqualTo(12000L);
    assertThat(cash.amountDuePaise()).isEqualTo(0L);
    assertThat(cash.changePaise()).isEqualTo(800L);

    InvoicePaymentPolicy.Allocation mixed =
        InvoicePaymentPolicy.allocate(
            11200L,
            0L,
            List.of(
                part(PaymentMode.CASH, 5000L, null),
                part(PaymentMode.UPI, 3000L, "UPI-9"),
                part(PaymentMode.CREDIT, 3200L, null)));
    assertThat(mixed.amountPaidPaise()).isEqualTo(11200L);
    assertThat(mixed.amountDuePaise()).isEqualTo(3200L);
    assertThat(mixed.changePaise()).isEqualTo(0L);
  }

  @Test
  void ac03_referenceIsOptionalManualMarkNotGateway() {
    InvoicePaymentPolicy.Allocation allocation =
        InvoicePaymentPolicy.allocate(
            11200L, 0L, List.of(part(PaymentMode.CARD, 11200L, "POS-SWIPE")));
    assertThat(allocation.parts().get(0).reference()).isEqualTo("POS-SWIPE");
    assertThat(allocation.parts().get(0).mode()).isEqualTo(PaymentMode.CARD);
  }

  @Test
  void ac05_underOverAndInvalidChangeFail() {
    assertThatThrownBy(
            () ->
                InvoicePaymentPolicy.allocate(
                    11200L, 0L, List.of(part(PaymentMode.CASH, 5000L, null))))
        .isInstanceOf(ApiException.class)
        .satisfies(
            ex -> {
              ApiException api = (ApiException) ex;
              assertThat(api.getStatus()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
              assertThat(api.getCode()).isEqualTo(InvoicePaymentPolicy.UNDER_ALLOCATION);
            });

    assertThatThrownBy(
            () ->
                InvoicePaymentPolicy.allocate(
                    11200L, 0L, List.of(part(PaymentMode.UPI, 15000L, "UPI-X"))))
        .isInstanceOf(ApiException.class)
        .satisfies(
            ex -> {
              ApiException api = (ApiException) ex;
              assertThat(api.getStatus()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
              assertThat(api.getCode()).isEqualTo(InvoicePaymentPolicy.OVER_ALLOCATION);
            });

    assertThatThrownBy(
            () ->
                InvoicePaymentPolicy.allocate(
                    11200L, 800L, List.of(part(PaymentMode.UPI, 12000L, "UPI-X"))))
        .isInstanceOf(ApiException.class)
        .satisfies(
            ex -> {
              ApiException api = (ApiException) ex;
              assertThat(api.getStatus()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
              assertThat(api.getCode()).isEqualTo(InvoicePaymentPolicy.INVALID_CHANGE);
            });
  }

  private static InvoicePaymentPolicy.Part part(PaymentMode mode, long amount, String reference) {
    return new InvoicePaymentPolicy.Part(mode, amount, reference);
  }
}
