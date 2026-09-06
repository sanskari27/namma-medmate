package com.nammamedmate.server.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.nammamedmate.server.shared.exception.ApiException;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Arrays;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;

class CashfreeBillingPolicyTest {

  @Test
  void ac01_posModesExcludeCashfree() {
    Set<String> modes =
        Arrays.stream(PaymentMode.values()).map(Enum::name).collect(Collectors.toSet());
    assertThat(CashfreeBillingPolicy.posModesExcludeCashfree(modes)).isTrue();
    assertThatThrownBy(() -> CashfreeBillingPolicy.rejectPosGateway("CASHFREE"))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(CashfreeBillingPolicy.POS_GATEWAY);
    assertThatThrownBy(
            () -> CashfreeBillingPolicy.rejectPosGateway("/api/v1/sales/invoices/x/cashfree"))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(CashfreeBillingPolicy.POS_GATEWAY);
    CashfreeBillingPolicy.rejectPosGateway("CASH");
    CashfreeBillingPolicy.rejectPosGateway("/api/v1/sales/invoices/x/complete");
  }

  @Test
  void ac02_checkoutAmountComesFromCatalogueNotClient() {
    assertThat(CashfreeBillingPolicy.amountPaise(PlanCode.STARTER)).isEqualTo(69_900);
    assertThat(CashfreeBillingPolicy.amountPaise(PlanCode.GROWTH)).isEqualTo(149_900);
    assertThat(CashfreeBillingPolicy.amountPaise(PlanCode.PRO)).isEqualTo(299_900);
    assertThat(CashfreeBillingPolicy.rupeesFromPaise(69_900)).isEqualByComparingTo("699.00");
    CashfreeBillingPolicy.requireMatchingAmount(69_900, new BigDecimal("699.00"));
    assertThatThrownBy(
            () -> CashfreeBillingPolicy.requireMatchingAmount(69_900, new BigDecimal("1.00")))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(CashfreeBillingPolicy.AMOUNT_MISMATCH);
  }

  @Test
  void ac04_freeHasNoCheckoutAndPaidUpgradeRequiresPayment() {
    assertThatThrownBy(() -> CashfreeBillingPolicy.requirePaidPlan(PlanCode.FREE))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(CashfreeBillingPolicy.PAYMENT_REQUIRED);
    assertThatThrownBy(() -> CashfreeBillingPolicy.requirePaymentForPaidUpgrade(PlanCode.STARTER))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(CashfreeBillingPolicy.PAYMENT_REQUIRED);
    CashfreeBillingPolicy.requirePaymentForPaidUpgrade(PlanCode.FREE);
  }

  @Test
  void ac05_mismatchedTenantAndAgedPendingAreExceptions() {
    UUID stored = UUID.fromString("11111111-1111-1111-1111-111111111111");
    UUID other = UUID.fromString("22222222-2222-2222-2222-222222222222");
    CashfreeBillingPolicy.requireMatchingTenant(stored, stored);
    CashfreeBillingPolicy.requireMatchingTenant(stored, null);
    assertThatThrownBy(() -> CashfreeBillingPolicy.requireMatchingTenant(stored, other))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(CashfreeBillingPolicy.TENANT_MISMATCH);
    Instant now = Instant.parse("2026-09-06T12:00:00Z");
    assertThat(
            CashfreeBillingPolicy.isException(
                SubscriptionPaymentStatus.PENDING, now.minusSeconds(60), now))
        .isFalse();
    assertThat(
            CashfreeBillingPolicy.isException(
                SubscriptionPaymentStatus.PENDING,
                now.minus(CashfreeBillingPolicy.PENDING_AGE),
                now))
        .isTrue();
    assertThat(CashfreeBillingPolicy.isException(SubscriptionPaymentStatus.FAILED, now, now))
        .isTrue();
    assertThat(CashfreeBillingPolicy.isException(SubscriptionPaymentStatus.SUCCESS, now, now))
        .isFalse();
  }
}
