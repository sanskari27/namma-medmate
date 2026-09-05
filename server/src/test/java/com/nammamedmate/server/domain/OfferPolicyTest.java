package com.nammamedmate.server.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.nammamedmate.server.shared.exception.ApiException;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class OfferPolicyTest {

  private static final Instant NOW = Instant.parse("2026-09-05T12:00:00Z");
  private static final BigDecimal THREE = new BigDecimal("3");
  private static final BigDecimal SIX = new BigDecimal("6");

  @Test
  void ac01_highestPriorityWins() {
    UUID high = UUID.randomUUID();
    UUID low = UUID.randomUUID();
    assertThat(
            OfferPolicy.selectWinner(
                List.of(
                    new OfferPolicy.RankedOffer(low, 4), new OfferPolicy.RankedOffer(high, 10))))
        .isEqualTo(high);
  }

  @Test
  void ac01_oneOfferPerLine() {
    assertThat(OfferPolicy.selectWinner(List.of(new OfferPolicy.RankedOffer(UUID.randomUUID(), 7))))
        .isNotNull();
  }

  @Test
  void ac01_bogoFreeQuantityAndBenefit() {
    assertThat(OfferPolicy.bogoFreeQuantity(THREE, 2, 1)).isEqualTo(1L);
    assertThat(OfferPolicy.bogoFreeQuantity(new BigDecimal("5"), 2, 1)).isEqualTo(1L);
    assertThat(OfferPolicy.bogoFreeQuantity(SIX, 2, 1)).isEqualTo(2L);
    assertThat(OfferPolicy.bogoBenefitPaise(THREE, 2, 1, 10000L)).isEqualTo(10000L);
  }

  @Test
  void ac01_seasonalPercentAppliesBeforeGst() {
    long benefit = OfferPolicy.percentOrFlatBenefit(10000L, OfferBenefitType.PERCENT, 1000L);
    assertThat(benefit).isEqualTo(1000L);
    InvoicePolicy.PricedBill bill =
        InvoicePolicy.priceBill(
            List.of(
                new InvoicePolicy.LinePriceInput(
                    BigDecimal.ONE, 10000L, DiscountType.NONE, 0L, new BigDecimal("12"), benefit)),
            DiscountType.NONE,
            0L,
            TaxJurisdiction.INTRA);
    assertThat(bill.discountPaise()).isEqualTo(1000L);
    assertThat(bill.subtotalPaise()).isEqualTo(9000L);
    assertThat(bill.taxPaise()).isEqualTo(1080L);
    assertThat(bill.totalPaise()).isEqualTo(10080L);
  }

  @Test
  void ac01_bundleSplitsFlatBenefitByGrossShare() {
    UUID cheap = UUID.randomUUID();
    UUID dear = UUID.randomUUID();
    Map<UUID, Long> allocated =
        OfferPolicy.allocateBundleBenefit(
            Map.of(cheap, 10000L, dear, 30000L), OfferBenefitType.FLAT, 4000L);
    assertThat(allocated.get(cheap)).isEqualTo(1000L);
    assertThat(allocated.get(dear)).isEqualTo(3000L);
  }

  @Test
  void ac03_expiredAndInactiveNeverApply() {
    Instant start = Instant.parse("2026-01-01T00:00:00Z");
    Instant ended = Instant.parse("2026-08-01T00:00:00Z");
    assertThat(OfferPolicy.appliesNow(OfferStatus.ACTIVE, NOW, start, ended)).isFalse();
    assertThat(OfferPolicy.appliesNow(OfferStatus.INACTIVE, NOW, null, null)).isFalse();
    assertThat(OfferPolicy.appliesNow(OfferStatus.DRAFT, NOW, null, null)).isFalse();
    assertThat(OfferPolicy.appliesNow(OfferStatus.ACTIVE, NOW, null, null)).isTrue();
    assertThat(
            OfferPolicy.appliesNow(
                OfferStatus.ACTIVE, NOW, start, Instant.parse("2026-12-01T00:00:00Z")))
        .isTrue();
  }

  @Test
  void ac04_manualDiscountPlusSchemeIsDeterministic() {
    long offer = OfferPolicy.percentOrFlatBenefit(10000L, OfferBenefitType.PERCENT, 1000L);
    InvoicePolicy.LinePriceInput line =
        new InvoicePolicy.LinePriceInput(
            BigDecimal.ONE, 10000L, DiscountType.PERCENT, 1000L, new BigDecimal("12"), offer);
    InvoicePolicy.PricedBill first =
        InvoicePolicy.priceBill(List.of(line), DiscountType.NONE, 0L, TaxJurisdiction.INTRA);
    InvoicePolicy.PricedBill second =
        InvoicePolicy.priceBill(List.of(line), DiscountType.NONE, 0L, TaxJurisdiction.INTRA);
    assertThat(first.totalPaise()).isEqualTo(second.totalPaise());
    assertThat(first.discountPaise()).isEqualTo(2000L);
    assertThat(first.subtotalPaise()).isEqualTo(8000L);
    assertThat(first.taxPaise()).isEqualTo(960L);
    assertThat(first.totalPaise()).isEqualTo(8960L);
  }

  @Test
  void ac05_ambiguousPrecedenceInvalidDatesAndRecursiveBundleFail() {
    UUID left = UUID.randomUUID();
    UUID right = UUID.randomUUID();
    assertThatThrownBy(
            () ->
                OfferPolicy.selectWinner(
                    List.of(
                        new OfferPolicy.RankedOffer(left, 5),
                        new OfferPolicy.RankedOffer(right, 5))))
        .isInstanceOf(ApiException.class)
        .satisfies(
            ex ->
                assertCode(
                    (ApiException) ex,
                    OfferPolicy.AMBIGUOUS_PRECEDENCE,
                    HttpStatus.UNPROCESSABLE_ENTITY));
    Instant later = Instant.parse("2026-10-01T00:00:00Z");
    Instant earlier = Instant.parse("2026-09-01T00:00:00Z");
    assertThatThrownBy(() -> OfferPolicy.requireValidWindow(later, earlier, OfferKind.SEASONAL))
        .isInstanceOf(ApiException.class)
        .satisfies(
            ex ->
                assertCode(
                    (ApiException) ex, OfferPolicy.INVALID_DATES, HttpStatus.UNPROCESSABLE_ENTITY));
    assertThatThrownBy(() -> OfferPolicy.requireValidWindow(null, null, OfferKind.SEASONAL))
        .isInstanceOf(ApiException.class)
        .satisfies(
            ex ->
                assertCode(
                    (ApiException) ex, OfferPolicy.INVALID_DATES, HttpStatus.UNPROCESSABLE_ENTITY));
    UUID offerId = UUID.randomUUID();
    assertThatThrownBy(() -> OfferPolicy.requireNotRecursive(List.of(offerId), Set.of(offerId)))
        .isInstanceOf(ApiException.class)
        .satisfies(
            ex ->
                assertCode(
                    (ApiException) ex,
                    OfferPolicy.RECURSIVE_BUNDLE,
                    HttpStatus.UNPROCESSABLE_ENTITY));
  }

  private static void assertCode(ApiException api, String code, HttpStatus status) {
    assertThat(api.getCode()).isEqualTo(code);
    assertThat(api.getStatus()).isEqualTo(status);
  }
}
