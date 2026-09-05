package com.nammamedmate.server.domain;

import com.nammamedmate.server.shared.exception.ApiException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;

public final class OfferPolicy {

  public static final String AMBIGUOUS_PRECEDENCE = "AMBIGUOUS_PRECEDENCE";
  public static final String RECURSIVE_BUNDLE = "RECURSIVE_BUNDLE";
  public static final String INVALID_DATES = "INVALID_DATES";
  public static final String OFFER_INVALID = "OFFER_INVALID";

  private OfferPolicy() {}

  public static UUID selectWinner(List<RankedOffer> eligible) {
    if (eligible == null || eligible.isEmpty()) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY, OFFER_INVALID, "No scheme matches this bill.");
    }
    RankedOffer best = eligible.get(0);
    boolean tie = false;
    for (int i = 1; i < eligible.size(); i++) {
      RankedOffer next = eligible.get(i);
      if (next.priority() > best.priority()) {
        best = next;
        tie = false;
      } else if (next.priority() == best.priority() && !next.id().equals(best.id())) {
        tie = true;
      }
    }
    if (tie) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          AMBIGUOUS_PRECEDENCE,
          "Two schemes share the same priority on this line. Change priority and try again.");
    }
    return best.id();
  }

  public static boolean appliesNow(
      OfferStatus status, Instant now, Instant startsAt, Instant endsAt) {
    if (status != OfferStatus.ACTIVE || now == null) {
      return false;
    }
    if (startsAt != null && now.isBefore(startsAt)) {
      return false;
    }
    return endsAt == null || !now.isAfter(endsAt);
  }

  public static void requireValidWindow(Instant startsAt, Instant endsAt, OfferKind kind) {
    boolean seasonal = kind == OfferKind.SEASONAL;
    if (seasonal && (startsAt == null || endsAt == null)) {
      throw invalidDates();
    }
    if (startsAt == null && endsAt == null) {
      return;
    }
    if (startsAt == null || endsAt == null || !startsAt.isBefore(endsAt)) {
      throw invalidDates();
    }
  }

  public static void requireNotRecursive(Collection<UUID> productIds, Set<UUID> offerIds) {
    if (productIds == null || offerIds == null || offerIds.isEmpty()) {
      return;
    }
    for (UUID productId : productIds) {
      if (productId != null && offerIds.contains(productId)) {
        throw new ApiException(
            HttpStatus.UNPROCESSABLE_ENTITY,
            RECURSIVE_BUNDLE,
            "A bundle can only list medicines, not other schemes.");
      }
    }
  }

  public static long bogoFreeQuantity(BigDecimal quantity, int buy, int get) {
    if (quantity == null || buy <= 0 || get <= 0) {
      return 0L;
    }
    long qty = quantity.setScale(0, RoundingMode.DOWN).longValueExact();
    long pack = (long) buy + (long) get;
    if (pack <= 0L || qty <= 0L) {
      return 0L;
    }
    return (qty / pack) * get;
  }

  public static long bogoBenefitPaise(BigDecimal quantity, int buy, int get, long sellingPaise) {
    if (sellingPaise <= 0L) {
      return 0L;
    }
    return bogoFreeQuantity(quantity, buy, get) * sellingPaise;
  }

  public static long percentOrFlatBenefit(long grossPaise, OfferBenefitType type, long value) {
    if (grossPaise <= 0L || value <= 0L || type == null || type == OfferBenefitType.FREE_QTY) {
      return 0L;
    }
    if (type == OfferBenefitType.FLAT) {
      return Math.min(value, grossPaise);
    }
    return BigDecimal.valueOf(grossPaise)
        .multiply(BigDecimal.valueOf(value))
        .divide(BigDecimal.valueOf(10000), 0, RoundingMode.HALF_UP)
        .longValueExact();
  }

  public static Map<UUID, Long> allocateBundleBenefit(
      Map<UUID, Long> lineGrosses, OfferBenefitType type, long value) {
    Map<UUID, Long> allocated = new LinkedHashMap<>();
    if (lineGrosses == null || lineGrosses.isEmpty()) {
      return allocated;
    }
    long grossSum = 0L;
    List<UUID> ids = new ArrayList<>();
    List<Long> grosses = new ArrayList<>();
    for (Map.Entry<UUID, Long> entry : lineGrosses.entrySet()) {
      long gross = entry.getValue() == null ? 0L : entry.getValue();
      ids.add(entry.getKey());
      grosses.add(gross);
      grossSum += gross;
    }
    if (type == OfferBenefitType.PERCENT) {
      for (int i = 0; i < ids.size(); i++) {
        allocated.put(ids.get(i), percentOrFlatBenefit(grosses.get(i), type, value));
      }
      return allocated;
    }
    long benefit = percentOrFlatBenefit(grossSum, OfferBenefitType.FLAT, value);
    long used = 0L;
    for (int i = 0; i < ids.size(); i++) {
      if (i == ids.size() - 1) {
        allocated.put(ids.get(i), Math.max(0L, benefit - used));
      } else if (grossSum == 0L) {
        allocated.put(ids.get(i), 0L);
      } else {
        long share =
            BigDecimal.valueOf(benefit)
                .multiply(BigDecimal.valueOf(grosses.get(i)))
                .divide(BigDecimal.valueOf(grossSum), 0, RoundingMode.HALF_UP)
                .longValueExact();
        allocated.put(ids.get(i), share);
        used += share;
      }
    }
    return allocated;
  }

  public static String explanation(OfferKind kind, String name, long benefitPaise) {
    String label = name == null || name.isBlank() ? "scheme" : name.trim();
    if (kind == OfferKind.BOGO) {
      return label + " — free qty on this line (" + benefitPaise + " paise).";
    }
    if (kind == OfferKind.BUNDLE) {
      return label + " — bundle saving on this line (" + benefitPaise + " paise).";
    }
    return label + " — scheme on this line (" + benefitPaise + " paise).";
  }

  private static ApiException invalidDates() {
    return new ApiException(
        HttpStatus.UNPROCESSABLE_ENTITY, INVALID_DATES, "Scheme dates must start before they end.");
  }

  public record RankedOffer(UUID id, int priority) {}
}
