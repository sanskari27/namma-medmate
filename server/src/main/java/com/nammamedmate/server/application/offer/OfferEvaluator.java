package com.nammamedmate.server.application.offer;

import com.nammamedmate.server.domain.OfferKind;
import com.nammamedmate.server.domain.OfferPolicy;
import com.nammamedmate.server.domain.OfferProductSlot;
import com.nammamedmate.server.domain.OfferStatus;
import com.nammamedmate.server.domain.SalesInvoiceLine;
import com.nammamedmate.server.domain.SalesOffer;
import com.nammamedmate.server.domain.SalesOfferProduct;
import com.nammamedmate.server.persistence.SalesOfferProductRepository;
import com.nammamedmate.server.persistence.SalesOfferRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class OfferEvaluator {

  private final SalesOfferRepository salesOfferRepository;
  private final SalesOfferProductRepository salesOfferProductRepository;

  public OfferEvaluator(
      SalesOfferRepository salesOfferRepository,
      SalesOfferProductRepository salesOfferProductRepository) {
    this.salesOfferRepository = salesOfferRepository;
    this.salesOfferProductRepository = salesOfferProductRepository;
  }

  public List<InvoiceOfferListResult.Item> eligible(
      UUID tenantId, List<SalesInvoiceLine> lines, Instant now) {
    List<LoadedOffer> loaded = loadActive(tenantId, now);
    Map<UUID, SalesInvoiceLine> byProduct = byProduct(lines);
    List<InvoiceOfferListResult.Item> items = new ArrayList<>();
    for (LoadedOffer offer : loaded) {
      long benefit = previewBenefit(offer, byProduct);
      if (benefit <= 0L && !matches(offer, byProduct)) {
        continue;
      }
      if (!matches(offer, byProduct)) {
        continue;
      }
      items.add(
          new InvoiceOfferListResult.Item(
              offer.offer().getId(),
              offer.offer().getName(),
              offer.offer().getKind(),
              offer.offer().getPriority(),
              OfferPolicy.explanation(offer.offer().getKind(), offer.offer().getName(), benefit),
              benefit));
    }
    items.sort(
        Comparator.comparingInt(InvoiceOfferListResult.Item::priority)
            .reversed()
            .thenComparing(InvoiceOfferListResult.Item::name));
    return items;
  }

  public Map<UUID, LineAssignment> assignments(
      UUID tenantId, List<SalesInvoiceLine> lines, Instant now) {
    List<LoadedOffer> loaded = loadActive(tenantId, now);
    Map<UUID, SalesInvoiceLine> byProduct = byProduct(lines);
    Map<UUID, List<OfferPolicy.RankedOffer>> candidates = new LinkedHashMap<>();
    Map<UUID, LoadedOffer> byId = new HashMap<>();
    for (LoadedOffer offer : loaded) {
      byId.put(offer.offer().getId(), offer);
      for (SalesInvoiceLine line : lines) {
        if (!lineEligible(offer, line, byProduct)) {
          continue;
        }
        candidates
            .computeIfAbsent(line.getProductId(), ignored -> new ArrayList<>())
            .add(new OfferPolicy.RankedOffer(offer.offer().getId(), offer.offer().getPriority()));
      }
    }
    Map<UUID, LineAssignment> assigned = new LinkedHashMap<>();
    for (SalesInvoiceLine line : lines) {
      List<OfferPolicy.RankedOffer> options = candidates.get(line.getProductId());
      if (options == null || options.isEmpty()) {
        continue;
      }
      UUID winnerId = OfferPolicy.selectWinner(options);
      LoadedOffer winner = byId.get(winnerId);
      long benefit = lineBenefit(winner, line, byProduct);
      if (benefit <= 0L) {
        continue;
      }
      assigned.put(
          line.getProductId(),
          new LineAssignment(
              winner.offer().getId(),
              winner.offer().getName(),
              winner.offer().getKind(),
              winner.offer().getPriority(),
              benefit,
              OfferPolicy.explanation(
                  winner.offer().getKind(), winner.offer().getName(), benefit)));
    }
    return assigned;
  }

  private List<LoadedOffer> loadActive(UUID tenantId, Instant now) {
    List<SalesOffer> offers =
        salesOfferRepository.findAllByTenantIdAndStatus(tenantId, OfferStatus.ACTIVE);
    if (offers.isEmpty()) {
      return List.of();
    }
    List<UUID> ids = offers.stream().map(SalesOffer::getId).toList();
    List<SalesOfferProduct> products =
        salesOfferProductRepository.findAllByTenantIdAndOfferIdIn(tenantId, ids);
    Map<UUID, List<SalesOfferProduct>> grouped = new HashMap<>();
    for (SalesOfferProduct row : products) {
      grouped.computeIfAbsent(row.getOfferId(), ignored -> new ArrayList<>()).add(row);
    }
    List<LoadedOffer> loaded = new ArrayList<>();
    for (SalesOffer offer : offers) {
      if (!OfferPolicy.appliesNow(offer.getStatus(), now, offer.getStartsAt(), offer.getEndsAt())) {
        continue;
      }
      loaded.add(new LoadedOffer(offer, grouped.getOrDefault(offer.getId(), List.of())));
    }
    return loaded;
  }

  private static boolean matches(LoadedOffer offer, Map<UUID, SalesInvoiceLine> byProduct) {
    for (SalesInvoiceLine line : byProduct.values()) {
      if (lineEligible(offer, line, byProduct)) {
        return true;
      }
    }
    return false;
  }

  private static boolean lineEligible(
      LoadedOffer offer, SalesInvoiceLine line, Map<UUID, SalesInvoiceLine> byProduct) {
    Set<UUID> products = products(offer, slotFor(offer.offer().getKind()));
    if (!products.contains(line.getProductId())) {
      return false;
    }
    if (offer.offer().getKind() == OfferKind.BUNDLE) {
      return products.stream().allMatch(byProduct::containsKey);
    }
    if (offer.offer().getKind() == OfferKind.BOGO) {
      int buy = offer.offer().getBuyQuantity() == null ? 0 : offer.offer().getBuyQuantity();
      int get = offer.offer().getGetQuantity() == null ? 0 : offer.offer().getGetQuantity();
      return OfferPolicy.bogoFreeQuantity(line.getQuantity(), buy, get) > 0L;
    }
    return true;
  }

  private static long previewBenefit(LoadedOffer offer, Map<UUID, SalesInvoiceLine> byProduct) {
    long total = 0L;
    for (SalesInvoiceLine line : byProduct.values()) {
      if (lineEligible(offer, line, byProduct)) {
        total += lineBenefit(offer, line, byProduct);
      }
    }
    return total;
  }

  private static long lineBenefit(
      LoadedOffer offer, SalesInvoiceLine line, Map<UUID, SalesInvoiceLine> byProduct) {
    long gross = lineGross(line);
    if (offer.offer().getKind() == OfferKind.BOGO) {
      int buy = offer.offer().getBuyQuantity() == null ? 0 : offer.offer().getBuyQuantity();
      int get = offer.offer().getGetQuantity() == null ? 0 : offer.offer().getGetQuantity();
      return OfferPolicy.bogoBenefitPaise(
          line.getQuantity(), buy, get, line.getSellingPricePaise());
    }
    if (offer.offer().getKind() == OfferKind.BUNDLE) {
      Map<UUID, Long> grosses = new LinkedHashMap<>();
      for (UUID productId : products(offer, OfferProductSlot.BUNDLE)) {
        SalesInvoiceLine member = byProduct.get(productId);
        if (member != null) {
          grosses.put(productId, lineGross(member));
        }
      }
      return OfferPolicy.allocateBundleBenefit(
              grosses, offer.offer().getBenefitType(), offer.offer().getBenefitValue())
          .getOrDefault(line.getProductId(), 0L);
    }
    return OfferPolicy.percentOrFlatBenefit(
        gross, offer.offer().getBenefitType(), offer.offer().getBenefitValue());
  }

  private static Set<UUID> products(LoadedOffer offer, OfferProductSlot slot) {
    Set<UUID> ids = new HashSet<>();
    for (SalesOfferProduct row : offer.products()) {
      if (row.getSlot() == slot) {
        ids.add(row.getProductId());
      }
    }
    return ids;
  }

  private static OfferProductSlot slotFor(OfferKind kind) {
    if (kind == OfferKind.BUNDLE) {
      return OfferProductSlot.BUNDLE;
    }
    return OfferProductSlot.TRIGGER;
  }

  private static Map<UUID, SalesInvoiceLine> byProduct(List<SalesInvoiceLine> lines) {
    Map<UUID, SalesInvoiceLine> map = new LinkedHashMap<>();
    if (lines == null) {
      return map;
    }
    for (SalesInvoiceLine line : lines) {
      map.put(line.getProductId(), line);
    }
    return map;
  }

  private static long lineGross(SalesInvoiceLine line) {
    return line.getQuantity()
        .multiply(BigDecimal.valueOf(line.getSellingPricePaise()))
        .setScale(0, RoundingMode.HALF_UP)
        .longValueExact();
  }

  public record LineAssignment(
      UUID offerId,
      String offerName,
      OfferKind kind,
      int priority,
      long benefitPaise,
      String explanation) {}

  private record LoadedOffer(SalesOffer offer, List<SalesOfferProduct> products) {}
}
