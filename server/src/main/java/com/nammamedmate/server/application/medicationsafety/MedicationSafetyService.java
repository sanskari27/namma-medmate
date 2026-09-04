package com.nammamedmate.server.application.medicationsafety;

import com.nammamedmate.server.application.access.AccessQueryService;
import com.nammamedmate.server.application.audit.AuditRecordCommand;
import com.nammamedmate.server.application.audit.AuditService;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.Customer;
import com.nammamedmate.server.domain.ModuleCode;
import com.nammamedmate.server.domain.Product;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.CustomerRepository;
import com.nammamedmate.server.persistence.ProductRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MedicationSafetyService {

  public static final String ACK_ACTION = "MEDICATION_SAFETY_ACKNOWLEDGE";
  public static final String UNLINKED_CUSTOMER_CODE = "UNLINKED_CUSTOMER";

  private final CustomerRepository customerRepository;
  private final ProductRepository productRepository;
  private final AppUserRepository appUserRepository;
  private final AccessQueryService accessQueryService;
  private final AuditService auditService;
  private final Clock clock;

  public MedicationSafetyService(
      CustomerRepository customerRepository,
      ProductRepository productRepository,
      AppUserRepository appUserRepository,
      AccessQueryService accessQueryService,
      AuditService auditService,
      Clock clock) {
    this.customerRepository = customerRepository;
    this.productRepository = productRepository;
    this.appUserRepository = appUserRepository;
    this.accessQueryService = accessQueryService;
    this.auditService = auditService;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public MedicationSafetyEvaluationView evaluate(
      AuthPrincipal principal, MedicationSafetyEvaluateCommand command) {
    ActorContext actor = requireSalesAccess(principal);
    List<UUID> productIds = normalizeProductIds(command == null ? null : command.productIds());
    Customer customer =
        resolveCustomer(actor.tenantId(), command == null ? null : command.customerId());
    List<Product> products = loadProducts(actor.tenantId(), productIds);
    return buildEvaluation(customer, products);
  }

  @Transactional
  public MedicationSafetyAcknowledgeView acknowledge(
      AuthPrincipal principal, MedicationSafetyAcknowledgeCommand command) {
    ActorContext actor = requireSalesAccess(principal);
    if (command == null || command.customerId() == null) {
      throw unlinkedCustomer();
    }
    String reason = requireReason(command.reason());
    List<UUID> productIds = normalizeProductIds(command.productIds());
    Customer customer = requireCustomer(actor.tenantId(), command.customerId());
    List<Product> products = loadProducts(actor.tenantId(), productIds);
    MedicationSafetyEvaluationView evaluation = buildEvaluation(customer, products);
    Set<String> expectedKeys =
        evaluation.warnings().stream()
            .map(MedicationSafetyWarningView::warningKey)
            .collect(Collectors.toCollection(LinkedHashSet::new));
    Set<String> providedKeys =
        command.warningKeys() == null
            ? Set.of()
            : command.warningKeys().stream()
                .filter(key -> key != null && !key.isBlank())
                .collect(Collectors.toCollection(LinkedHashSet::new));
    if (!expectedKeys.equals(providedKeys)) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          "VALIDATION_ERROR",
          "Warning keys must match the current draft evaluation.");
    }
    Instant now = Instant.now(clock);
    recordAcknowledgement(actor, customer, products, evaluation.warnings(), reason, now);
    return new MedicationSafetyAcknowledgeView(true, now);
  }

  @Transactional
  public MedicationSafetyClearedView assertCleared(
      AuthPrincipal principal, MedicationSafetyAcknowledgeCommand command) {
    ActorContext actor = requireSalesAccess(principal);
    List<UUID> productIds = normalizeProductIds(command == null ? null : command.productIds());
    if (!productIds.isEmpty() && (command == null || command.customerId() == null)) {
      throw unlinkedCustomer();
    }
    Customer customer =
        resolveCustomer(actor.tenantId(), command == null ? null : command.customerId());
    List<Product> products = loadProducts(actor.tenantId(), productIds);
    MedicationSafetyEvaluationView evaluation = buildEvaluation(customer, products);

    if (evaluation.warnings().isEmpty()) {
      return new MedicationSafetyClearedView(true);
    }
    if (customer == null) {
      throw unlinkedCustomer();
    }
    String reason = requireReason(command == null ? null : command.reason());
    Set<String> expectedKeys =
        evaluation.warnings().stream()
            .map(MedicationSafetyWarningView::warningKey)
            .collect(Collectors.toCollection(LinkedHashSet::new));
    Set<String> providedKeys =
        command.warningKeys() == null
            ? Set.of()
            : command.warningKeys().stream()
                .filter(key -> key != null && !key.isBlank())
                .collect(Collectors.toCollection(LinkedHashSet::new));
    if (!expectedKeys.equals(providedKeys)) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          "VALIDATION_ERROR",
          "Warning keys must match the current draft evaluation.");
    }
    Instant now = Instant.now(clock);
    recordAcknowledgement(actor, customer, products, evaluation.warnings(), reason, now);
    return new MedicationSafetyClearedView(true);
  }

  private MedicationSafetyEvaluationView buildEvaluation(
      Customer customer, List<Product> products) {
    if (products.isEmpty()) {
      return new MedicationSafetyEvaluationView("NOT_CHECKED", "Not checked", 0, List.of());
    }

    boolean incomplete = false;
    List<MedicationSafetyWarningView> warnings = new ArrayList<>();

    if (customer != null) {
      List<String> allergens = MedicationSafetyMatcher.allergenTokens(customer.getAllergies());
      if (!allergens.isEmpty()) {
        for (Product product : products) {
          if (!MedicationSafetyMatcher.hasMatchableIdentity(product)) {
            incomplete = true;
            continue;
          }
          for (String allergen : allergens) {
            MedicationSafetyMatcher.MatchResult match =
                MedicationSafetyMatcher.matchAllergy(allergen, product);
            if (match != null) {
              warnings.add(
                  new MedicationSafetyWarningView(
                      MedicationSafetyMatcher.warningKeyAllergy(
                          customer.getId(), product.getId(), match.matchedAllergen()),
                      "ALLERGY",
                      customer.getId(),
                      product.getId(),
                      List.of(product.getId()),
                      match.matchedAllergen(),
                      null,
                      match.matchedField(),
                      "WARN",
                      "REVIEW",
                      true));
            }
          }
        }
      }
    }

    for (Product product : products) {
      if (!MedicationSafetyMatcher.hasComposition(product)) {
        incomplete = true;
      }
    }

    Map<String, List<UUID>> duplicates =
        MedicationSafetyMatcher.groupByNormalizedComposition(products);
    for (Map.Entry<String, List<UUID>> entry : duplicates.entrySet()) {
      warnings.add(
          new MedicationSafetyWarningView(
              MedicationSafetyMatcher.warningKeyDuplicate(entry.getKey(), entry.getValue()),
              "DUPLICATE_COMPOSITION",
              customer == null ? null : customer.getId(),
              null,
              entry.getValue(),
              null,
              entry.getKey(),
              "composition",
              "WARN",
              "REVIEW",
              true));
    }

    String status = incomplete ? "INCOMPLETE" : "CHECKED";
    String label = incomplete ? "Not checked" : null;
    return new MedicationSafetyEvaluationView(
        status, label, products.size(), List.copyOf(warnings));
  }

  private void recordAcknowledgement(
      ActorContext actor,
      Customer customer,
      List<Product> products,
      List<MedicationSafetyWarningView> warnings,
      String reason,
      Instant now) {
    String productIds =
        products.stream()
            .map(product -> product.getId().toString())
            .collect(Collectors.joining(","));
    String warningSummary =
        warnings.stream()
            .map(MedicationSafetyWarningView::warningKey)
            .collect(Collectors.joining(","));
    String contextJson =
        "{\"customerId\":\""
            + customer.getId()
            + "\",\"productIds\":["
            + products.stream()
                .map(product -> "\"" + product.getId() + "\"")
                .collect(Collectors.joining(","))
            + "],\"warnings\":["
            + warnings.stream()
                .map(
                    warning ->
                        "{\"warningKey\":\""
                            + escape(warning.warningKey())
                            + "\",\"kind\":\""
                            + warning.kind()
                            + "\""
                            + (warning.matchedAllergen() == null
                                ? ""
                                : ",\"matchedAllergen\":\""
                                    + escape(warning.matchedAllergen())
                                    + "\"")
                            + (warning.matchedComposition() == null
                                ? ""
                                : ",\"matchedComposition\":\""
                                    + escape(warning.matchedComposition())
                                    + "\"")
                            + "}")
                .collect(Collectors.joining(","))
            + "],\"reason\":\""
            + escape(reason)
            + "\",\"acknowledgedAt\":\""
            + now
            + "\",\"productIdList\":\""
            + escape(productIds)
            + "\",\"warningKeyList\":\""
            + escape(warningSummary)
            + "\"}";
    auditService.record(
        new AuditRecordCommand(
            actor.userId(),
            actor.tenantId(),
            actor.branchId(),
            ACK_ACTION,
            AuditService.OUTCOME_SUCCESS,
            null,
            null,
            null,
            actor.sessionId(),
            contextJson));
  }

  private Customer resolveCustomer(UUID tenantId, UUID customerId) {
    if (customerId == null) {
      return null;
    }
    return requireCustomer(tenantId, customerId);
  }

  private Customer requireCustomer(UUID tenantId, UUID customerId) {
    return customerRepository
        .findByIdAndTenantIdAndDeletedAtIsNull(customerId, tenantId)
        .orElseThrow(this::notFound);
  }

  private List<Product> loadProducts(UUID tenantId, List<UUID> productIds) {
    List<Product> products = new ArrayList<>();
    for (UUID productId : productIds) {
      Product product =
          productRepository.findByIdAndTenantId(productId, tenantId).orElseThrow(this::notFound);
      products.add(product);
    }
    return products;
  }

  private static List<UUID> normalizeProductIds(List<UUID> productIds) {
    if (productIds == null || productIds.isEmpty()) {
      return List.of();
    }
    return productIds.stream().filter(id -> id != null).distinct().toList();
  }

  private static String requireReason(String reason) {
    if (reason == null || reason.isBlank()) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          "VALIDATION_ERROR",
          "A review reason is required before continuing.");
    }
    return reason.trim();
  }

  private ActorContext requireSalesAccess(AuthPrincipal principal) {
    if (principal == null || principal.tenantId() == null) {
      throw forbidden();
    }
    if (principal.role() != AppUserRole.pharmacy_owner
        && principal.role() != AppUserRole.pharmacy_staff) {
      throw forbidden();
    }
    AppUser user =
        appUserRepository
            .findById(principal.userId())
            .filter(row -> row.getDeletedAt() == null)
            .orElseThrow(this::forbidden);
    if (!accessQueryService.effectiveModules(user).contains(ModuleCode.SALES)) {
      throw forbidden();
    }
    return new ActorContext(
        user.getId(), principal.tenantId(), principal.activeBranchId(), principal.sessionId());
  }

  private ApiException forbidden() {
    return new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Forbidden");
  }

  private ApiException notFound() {
    return new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Not found");
  }

  private ApiException unlinkedCustomer() {
    return new ApiException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        UNLINKED_CUSTOMER_CODE,
        "Link a customer before completing a draft with safety warnings.");
  }

  private static String escape(String value) {
    return value.replace("\\", "\\\\").replace("\"", "\\\"");
  }

  private record ActorContext(UUID userId, UUID tenantId, UUID branchId, UUID sessionId) {}
}
