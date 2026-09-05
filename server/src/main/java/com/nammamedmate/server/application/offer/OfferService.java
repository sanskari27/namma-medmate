package com.nammamedmate.server.application.offer;

import com.nammamedmate.server.application.access.AccessQueryService;
import com.nammamedmate.server.application.audit.AuditRecordCommand;
import com.nammamedmate.server.application.audit.AuditService;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.InvoicePolicy;
import com.nammamedmate.server.domain.ModuleCode;
import com.nammamedmate.server.domain.OfferBenefitType;
import com.nammamedmate.server.domain.OfferKind;
import com.nammamedmate.server.domain.OfferPolicy;
import com.nammamedmate.server.domain.OfferProductSlot;
import com.nammamedmate.server.domain.OfferStatus;
import com.nammamedmate.server.domain.SalesOffer;
import com.nammamedmate.server.domain.SalesOfferProduct;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.ProductRepository;
import com.nammamedmate.server.persistence.SalesOfferProductRepository;
import com.nammamedmate.server.persistence.SalesOfferRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OfferService {

  private final SalesOfferRepository salesOfferRepository;
  private final SalesOfferProductRepository salesOfferProductRepository;
  private final ProductRepository productRepository;
  private final AppUserRepository appUserRepository;
  private final AccessQueryService accessQueryService;
  private final AuditService auditService;
  private final Clock clock;

  public OfferService(
      SalesOfferRepository salesOfferRepository,
      SalesOfferProductRepository salesOfferProductRepository,
      ProductRepository productRepository,
      AppUserRepository appUserRepository,
      AccessQueryService accessQueryService,
      AuditService auditService,
      Clock clock) {
    this.salesOfferRepository = salesOfferRepository;
    this.salesOfferProductRepository = salesOfferProductRepository;
    this.productRepository = productRepository;
    this.appUserRepository = appUserRepository;
    this.accessQueryService = accessQueryService;
    this.auditService = auditService;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public OfferListResult list(AuthPrincipal principal) {
    UUID tenantId = requireSalesAccess(principal);
    List<SalesOffer> rows =
        salesOfferRepository.findAllByTenantIdOrderByPriorityDescNameAsc(tenantId);
    return new OfferListResult(rows.stream().map(row -> toView(row, productsOf(row))).toList());
  }

  @Transactional(readOnly = true)
  public OfferView get(AuthPrincipal principal, UUID id) {
    UUID tenantId = requireSalesAccess(principal);
    SalesOffer offer = requireOffer(id, tenantId);
    return toView(offer, productsOf(offer));
  }

  @Transactional
  public OfferView create(AuthPrincipal principal, OfferCommand command) {
    UUID tenantId = requireSalesAccess(principal);
    Instant now = clock.instant();
    SalesOffer offer = new SalesOffer();
    offer.setId(UUID.randomUUID());
    offer.setTenantId(tenantId);
    offer.setStatus(OfferStatus.DRAFT);
    offer.setVersion(1);
    offer.setCreatedAt(now);
    applyBody(offer, command, tenantId, now);
    salesOfferRepository.saveAndFlush(offer);
    replaceProducts(offer, command, tenantId);
    audit(principal, offer.getId(), "OFFER_DRAFT");
    return toView(offer, productsOf(offer));
  }

  @Transactional
  public OfferView update(AuthPrincipal principal, UUID id, OfferCommand command) {
    UUID tenantId = requireSalesAccess(principal);
    SalesOffer offer =
        salesOfferRepository.lockByIdAndTenantId(id, tenantId).orElseThrow(OfferService::notFound);
    InvoicePolicy.assertVersion(offer.getVersion(), command.expectedVersion());
    Instant now = clock.instant();
    applyBody(offer, command, tenantId, now);
    offer.setVersion(offer.getVersion() + 1);
    salesOfferRepository.saveAndFlush(offer);
    replaceProducts(offer, command, tenantId);
    return toView(offer, productsOf(offer));
  }

  @Transactional
  public OfferView publish(AuthPrincipal principal, UUID id, Integer expectedVersion) {
    UUID tenantId = requireSalesAccess(principal);
    SalesOffer offer =
        salesOfferRepository.lockByIdAndTenantId(id, tenantId).orElseThrow(OfferService::notFound);
    InvoicePolicy.assertVersion(offer.getVersion(), expectedVersion);
    if (offer.getStatus() != OfferStatus.DRAFT && offer.getStatus() != OfferStatus.ACTIVE) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          OfferPolicy.OFFER_INVALID,
          "Only a draft or live scheme can be published.");
    }
    Instant now = clock.instant();
    offer.setStatus(OfferStatus.ACTIVE);
    offer.setVersion(offer.getVersion() + 1);
    offer.setUpdatedAt(now);
    salesOfferRepository.save(offer);
    audit(principal, offer.getId(), "OFFER_PUBLISH");
    return toView(offer, productsOf(offer));
  }

  @Transactional
  public OfferView deactivate(AuthPrincipal principal, UUID id, Integer expectedVersion) {
    UUID tenantId = requireSalesAccess(principal);
    SalesOffer offer =
        salesOfferRepository.lockByIdAndTenantId(id, tenantId).orElseThrow(OfferService::notFound);
    InvoicePolicy.assertVersion(offer.getVersion(), expectedVersion);
    Instant now = clock.instant();
    offer.setStatus(OfferStatus.INACTIVE);
    offer.setVersion(offer.getVersion() + 1);
    offer.setUpdatedAt(now);
    salesOfferRepository.save(offer);
    audit(principal, offer.getId(), "OFFER_DEACTIVATE");
    return toView(offer, productsOf(offer));
  }

  private void applyBody(SalesOffer offer, OfferCommand command, UUID tenantId, Instant now) {
    if (command == null
        || command.name() == null
        || command.name().isBlank()
        || command.kind() == null
        || command.priority() == null
        || command.benefitType() == null
        || command.products() == null
        || command.products().isEmpty()) {
      throw validation();
    }
    String name = command.name().trim();
    if (name.length() > 120) {
      throw validation();
    }
    OfferPolicy.requireValidWindow(command.startsAt(), command.endsAt(), command.kind());
    if (command.kind() == OfferKind.BOGO) {
      if (command.buyQuantity() == null
          || command.getQuantity() == null
          || command.buyQuantity() <= 0
          || command.getQuantity() <= 0
          || command.benefitType() != OfferBenefitType.FREE_QTY) {
        throw new ApiException(
            HttpStatus.UNPROCESSABLE_ENTITY,
            OfferPolicy.OFFER_INVALID,
            "Buy/get quantities are required for a BOGO scheme.");
      }
    }
    if (command.kind() == OfferKind.SEASONAL
        && command.benefitType() == OfferBenefitType.FREE_QTY) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          OfferPolicy.OFFER_INVALID,
          "Seasonal schemes use percent or flat savings.");
    }
    Set<UUID> offerIds =
        salesOfferRepository.findAllByTenantId(tenantId).stream()
            .map(SalesOffer::getId)
            .filter(id -> !id.equals(offer.getId()))
            .collect(Collectors.toCollection(HashSet::new));
    List<UUID> productIds = new ArrayList<>();
    Set<OfferProductSlot> slots = new HashSet<>();
    for (OfferCommand.ProductRef ref : command.products()) {
      if (ref == null || ref.productId() == null || ref.slot() == null) {
        throw validation();
      }
      productIds.add(ref.productId());
      slots.add(ref.slot());
    }
    OfferPolicy.requireNotRecursive(productIds, offerIds);
    for (UUID productId : productIds) {
      productRepository
          .findByIdAndTenantId(productId, tenantId)
          .orElseThrow(OfferService::notFound);
    }
    if (command.kind() == OfferKind.BOGO
        && (!slots.contains(OfferProductSlot.TRIGGER)
            || !slots.contains(OfferProductSlot.BENEFIT))) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          OfferPolicy.OFFER_INVALID,
          "BOGO needs a buy medicine and a free medicine.");
    }
    if (command.kind() == OfferKind.SEASONAL && !slots.contains(OfferProductSlot.TRIGGER)) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          OfferPolicy.OFFER_INVALID,
          "Seasonal schemes need at least one medicine.");
    }
    if (command.kind() == OfferKind.BUNDLE && !slots.contains(OfferProductSlot.BUNDLE)) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          OfferPolicy.OFFER_INVALID,
          "A bundle needs medicines on this bill together.");
    }
    offer.setName(name);
    offer.setKind(command.kind());
    offer.setPriority(command.priority());
    offer.setStartsAt(command.startsAt());
    offer.setEndsAt(command.endsAt());
    offer.setBuyQuantity(command.buyQuantity());
    offer.setGetQuantity(command.getQuantity());
    offer.setBenefitType(command.benefitType());
    offer.setBenefitValue(command.benefitValue() == null ? 0L : command.benefitValue());
    offer.setUpdatedAt(now);
  }

  private void replaceProducts(SalesOffer offer, OfferCommand command, UUID tenantId) {
    salesOfferProductRepository.deleteByOfferIdAndTenantId(offer.getId(), tenantId);
    salesOfferProductRepository.flush();
    for (OfferCommand.ProductRef ref : command.products()) {
      SalesOfferProduct row = new SalesOfferProduct();
      row.setId(UUID.randomUUID());
      row.setTenantId(tenantId);
      row.setOfferId(offer.getId());
      row.setProductId(ref.productId());
      row.setSlot(ref.slot());
      salesOfferProductRepository.save(row);
    }
  }

  private List<SalesOfferProduct> productsOf(SalesOffer offer) {
    return salesOfferProductRepository.findAllByOfferIdAndTenantId(
        offer.getId(), offer.getTenantId());
  }

  private OfferView toView(SalesOffer offer, List<SalesOfferProduct> products) {
    return new OfferView(
        offer.getId(),
        offer.getTenantId(),
        offer.getName(),
        offer.getKind(),
        offer.getStatus(),
        offer.getPriority(),
        offer.getStartsAt(),
        offer.getEndsAt(),
        offer.getBuyQuantity(),
        offer.getGetQuantity(),
        offer.getBenefitType(),
        offer.getBenefitValue(),
        offer.getVersion(),
        products.stream()
            .map(row -> new OfferView.ProductView(row.getProductId(), row.getSlot()))
            .toList(),
        offer.getCreatedAt(),
        offer.getUpdatedAt());
  }

  private SalesOffer requireOffer(UUID id, UUID tenantId) {
    return salesOfferRepository
        .findByIdAndTenantId(id, tenantId)
        .orElseThrow(OfferService::notFound);
  }

  private UUID requireSalesAccess(AuthPrincipal principal) {
    if (principal == null || principal.tenantId() == null) {
      throw forbidden();
    }
    AppUser user =
        appUserRepository
            .findById(principal.userId())
            .filter(row -> row.getDeletedAt() == null)
            .orElseThrow(OfferService::forbidden);
    if (!accessQueryService.effectiveModules(user).contains(ModuleCode.SALES)) {
      throw forbidden();
    }
    return principal.tenantId();
  }

  private void audit(AuthPrincipal principal, UUID offerId, String action) {
    auditService.record(
        new AuditRecordCommand(
            principal.userId(),
            principal.tenantId(),
            principal.activeBranchId(),
            action,
            AuditService.OUTCOME_SUCCESS,
            null,
            null,
            null,
            principal.sessionId(),
            "{\"offerId\":\"" + offerId + "\"}"));
  }

  private static ApiException validation() {
    return new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
  }

  private static ApiException forbidden() {
    return new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Forbidden");
  }

  private static ApiException notFound() {
    return new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Scheme was not found");
  }
}
