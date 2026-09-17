package com.nammamedmate.server.application.customer;

import com.nammamedmate.server.application.access.AccessQueryService;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.Customer;
import com.nammamedmate.server.domain.CustomerCreditAccount;
import com.nammamedmate.server.domain.CustomerFamilyMember;
import com.nammamedmate.server.domain.CustomerLoyaltyAccount;
import com.nammamedmate.server.domain.ModuleCode;
import com.nammamedmate.server.domain.PaymentMode;
import com.nammamedmate.server.domain.SalesInvoice;
import com.nammamedmate.server.domain.SalesInvoiceLine;
import com.nammamedmate.server.domain.SalesInvoicePayment;
import com.nammamedmate.server.domain.SalesInvoiceStatus;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.CustomerCreditAccountRepository;
import com.nammamedmate.server.persistence.CustomerFamilyMemberRepository;
import com.nammamedmate.server.persistence.CustomerLoyaltyAccountRepository;
import com.nammamedmate.server.persistence.CustomerRepository;
import com.nammamedmate.server.persistence.SalesInvoiceLineRepository;
import com.nammamedmate.server.persistence.SalesInvoicePaymentRepository;
import com.nammamedmate.server.persistence.SalesInvoiceRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CustomerDirectoryService {

  private final CustomerRepository customerRepository;
  private final AppUserRepository appUserRepository;
  private final AccessQueryService accessQueryService;
  private final SalesInvoiceRepository salesInvoiceRepository;
  private final SalesInvoiceLineRepository salesInvoiceLineRepository;
  private final SalesInvoicePaymentRepository salesInvoicePaymentRepository;
  private final CustomerCreditAccountRepository creditAccountRepository;
  private final CustomerLoyaltyAccountRepository loyaltyAccountRepository;
  private final CustomerFamilyMemberRepository familyMemberRepository;

  public CustomerDirectoryService(
      CustomerRepository customerRepository,
      AppUserRepository appUserRepository,
      AccessQueryService accessQueryService,
      SalesInvoiceRepository salesInvoiceRepository,
      SalesInvoiceLineRepository salesInvoiceLineRepository,
      SalesInvoicePaymentRepository salesInvoicePaymentRepository,
      CustomerCreditAccountRepository creditAccountRepository,
      CustomerLoyaltyAccountRepository loyaltyAccountRepository,
      CustomerFamilyMemberRepository familyMemberRepository) {
    this.customerRepository = customerRepository;
    this.appUserRepository = appUserRepository;
    this.accessQueryService = accessQueryService;
    this.salesInvoiceRepository = salesInvoiceRepository;
    this.salesInvoiceLineRepository = salesInvoiceLineRepository;
    this.salesInvoicePaymentRepository = salesInvoicePaymentRepository;
    this.creditAccountRepository = creditAccountRepository;
    this.loyaltyAccountRepository = loyaltyAccountRepository;
    this.familyMemberRepository = familyMemberRepository;
  }

  @Transactional(readOnly = true)
  public List<CustomerDirectoryView> list(AuthPrincipal principal, String query) {
    UUID tenantId = requireCrmAccess(principal);
    String q = query == null ? "" : query.trim();
    List<Customer> customers =
        q.isEmpty()
            ? customerRepository.findAllByTenantIdAndDeletedAtIsNullOrderByNameAsc(tenantId)
            : customerRepository.searchByTenant(tenantId, q);

    Map<UUID, SaleAgg> sales = loadSaleAggs(tenantId);
    Map<UUID, Long> units = loadUnits(tenantId);
    Map<UUID, Long> creditDue = loadCreditDue(tenantId, customers);
    Map<UUID, Long> loyalty = loadLoyalty(tenantId, customers);
    Map<UUID, UUID> familyByCustomer = loadFamilyIds(tenantId, customers);

    List<CustomerDirectoryView> items = new ArrayList<>();
    SaleAgg walkIn = sales.get(null);
    if (walkIn != null && walkIn.orderCount() > 0 && matchesWalkIn(q)) {
      long walkInUnits =
          toLongUnits(
              salesInvoiceRepository.sumWalkInUnits(tenantId, SalesInvoiceStatus.COMPLETED));
      items.add(
          new CustomerDirectoryView(
              null,
              true,
              "Walk-in customers",
              null,
              null,
              null,
              walkIn.orderCount(),
              walkIn.orderCount(),
              0,
              walkInUnits,
              walkIn.lastVisitAt(),
              walkIn.loyaltyEarned(),
              walkIn.lifetimePaise(),
              0L,
              false,
              walkIn.lastVisitAt(),
              walkIn.lastVisitAt(),
              null));
    }

    for (Customer customer : customers) {
      SaleAgg agg = sales.getOrDefault(customer.getId(), SaleAgg.empty());
      long due = creditDue.getOrDefault(customer.getId(), 0L);
      long points = loyalty.getOrDefault(customer.getId(), 0L);
      boolean chronic =
          customer.getChronicConditions() != null && !customer.getChronicConditions().isBlank();
      items.add(
          new CustomerDirectoryView(
              customer.getId(),
              false,
              customer.getName(),
              customer.getPhone(),
              customer.getEmail(),
              customer.getChronicConditions(),
              agg.orderCount(),
              agg.orderCount(),
              0,
              units.getOrDefault(customer.getId(), 0L),
              agg.lastVisitAt(),
              points,
              agg.lifetimePaise(),
              due,
              chronic,
              customer.getCreatedAt(),
              customer.getUpdatedAt(),
              familyByCustomer.get(customer.getId())));
    }
    return items;
  }

  @Transactional(readOnly = true)
  public List<CustomerDirectoryPurchaseView> purchases(
      AuthPrincipal principal, UUID customerId, boolean walkIn) {
    UUID tenantId = requireCrmAccess(principal);
    List<SalesInvoice> invoices =
        walkIn
            ? salesInvoiceRepository
                .findTop40ByTenantIdAndStatusAndCustomerIdIsNullOrderByCompletedAtDesc(
                    tenantId, SalesInvoiceStatus.COMPLETED)
            : salesInvoiceRepository
                .findTop40ByTenantIdAndStatusAndCustomerIdOrderByCompletedAtDesc(
                    tenantId, SalesInvoiceStatus.COMPLETED, customerId);
    if (invoices.isEmpty()) {
      return List.of();
    }
    if (!walkIn) {
      requireCustomer(customerId, tenantId);
    }
    List<UUID> invoiceIds = invoices.stream().map(SalesInvoice::getId).toList();
    Map<UUID, List<SalesInvoiceLine>> linesByInvoice =
        salesInvoiceLineRepository
            .findAllByTenantIdAndSalesInvoiceIdIn(tenantId, invoiceIds)
            .stream()
            .collect(Collectors.groupingBy(SalesInvoiceLine::getSalesInvoiceId));
    Map<UUID, List<SalesInvoicePayment>> paymentsByInvoice =
        salesInvoicePaymentRepository
            .findAllByTenantIdAndSalesInvoiceIdIn(tenantId, invoiceIds)
            .stream()
            .collect(Collectors.groupingBy(SalesInvoicePayment::getSalesInvoiceId));

    List<CustomerDirectoryPurchaseView> out = new ArrayList<>(invoices.size());
    for (SalesInvoice invoice : invoices) {
      List<SalesInvoiceLine> lines = linesByInvoice.getOrDefault(invoice.getId(), List.of());
      String itemSummary =
          lines.stream()
              .map(SalesInvoiceLine::getProductName)
              .filter(name -> name != null && !name.isBlank())
              .limit(4)
              .collect(Collectors.joining(", "));
      out.add(
          new CustomerDirectoryPurchaseView(
              invoice.getId(),
              invoice.getInvoiceNumber(),
              invoice.getTotalPaise(),
              itemSummary.isBlank() ? null : itemSummary,
              paymentLabel(paymentsByInvoice.getOrDefault(invoice.getId(), List.of())),
              invoice.getCompletedAt() != null
                  ? invoice.getCompletedAt()
                  : invoice.getCreatedAt()));
    }
    return out;
  }

  private Map<UUID, SaleAgg> loadSaleAggs(UUID tenantId) {
    Map<UUID, SaleAgg> map = new HashMap<>();
    for (Object[] row :
        salesInvoiceRepository.aggregateCompletedByCustomer(
            tenantId, SalesInvoiceStatus.COMPLETED)) {
      UUID customerId = (UUID) row[0];
      map.put(
          customerId,
          new SaleAgg(
              ((Number) row[1]).intValue(),
              ((Number) row[2]).longValue(),
              (Instant) row[3],
              ((Number) row[4]).longValue()));
    }
    Object[] walkIn = null;
    List<Object[]> walkInRows =
        salesInvoiceRepository.aggregateWalkInCompleted(tenantId, SalesInvoiceStatus.COMPLETED);
    if (walkInRows != null && !walkInRows.isEmpty()) {
      walkIn = walkInRows.get(0);
    }
    if (walkIn != null && walkIn[0] != null && ((Number) walkIn[0]).intValue() > 0) {
      map.put(
          null,
          new SaleAgg(
              ((Number) walkIn[0]).intValue(),
              ((Number) walkIn[1]).longValue(),
              (Instant) walkIn[2],
              ((Number) walkIn[3]).longValue()));
    }
    return map;
  }

  private Map<UUID, Long> loadUnits(UUID tenantId) {
    Map<UUID, Long> map = new HashMap<>();
    for (Object[] row :
        salesInvoiceRepository.sumUnitsByCustomer(tenantId, SalesInvoiceStatus.COMPLETED)) {
      map.put((UUID) row[0], toLongUnits(row[1]));
    }
    return map;
  }

  private Map<UUID, Long> loadCreditDue(UUID tenantId, List<Customer> customers) {
    if (customers.isEmpty()) {
      return Map.of();
    }
    List<UUID> ids = customers.stream().map(Customer::getId).toList();
    Map<UUID, Long> map = new HashMap<>();
    for (CustomerCreditAccount account :
        creditAccountRepository.findAllByTenantIdAndCustomerIdIn(tenantId, ids)) {
      map.put(account.getCustomerId(), account.getBalancePaise());
    }
    return map;
  }

  private Map<UUID, Long> loadLoyalty(UUID tenantId, List<Customer> customers) {
    if (customers.isEmpty()) {
      return Map.of();
    }
    List<UUID> ids = customers.stream().map(Customer::getId).toList();
    Map<UUID, Long> map = new HashMap<>();
    for (CustomerLoyaltyAccount account :
        loyaltyAccountRepository.findAllByTenantIdAndCustomerIdIn(tenantId, ids)) {
      map.put(account.getCustomerId(), account.getBalancePoints());
    }
    return map;
  }

  private Map<UUID, UUID> loadFamilyIds(UUID tenantId, List<Customer> customers) {
    if (customers.isEmpty()) {
      return Map.of();
    }
    List<UUID> ids = customers.stream().map(Customer::getId).toList();
    Map<UUID, UUID> map = new HashMap<>();
    for (CustomerFamilyMember member :
        familyMemberRepository.findAllByTenantIdAndCustomerIdIn(tenantId, ids)) {
      map.put(member.getCustomerId(), member.getFamilyId());
    }
    return map;
  }

  private Customer requireCustomer(UUID id, UUID tenantId) {
    return customerRepository
        .findByIdAndTenantIdAndDeletedAtIsNull(id, tenantId)
        .orElseThrow(
            () -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Customer was not found"));
  }

  private UUID requireCrmAccess(AuthPrincipal principal) {
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
            .orElseThrow(CustomerDirectoryService::forbidden);
    if (!accessQueryService.effectiveModules(user).contains(ModuleCode.CRM)) {
      throw forbidden();
    }
    return principal.tenantId();
  }

  private static boolean matchesWalkIn(String query) {
    if (query == null || query.isBlank()) {
      return true;
    }
    String q = query.toLowerCase(Locale.ROOT);
    return "walk-in customers".contains(q) || "walk in".contains(q) || "walkin".contains(q);
  }

  private static long toLongUnits(Object value) {
    if (value == null) {
      return 0L;
    }
    if (value instanceof BigDecimal decimal) {
      return decimal.setScale(0, RoundingMode.HALF_UP).longValue();
    }
    if (value instanceof Number number) {
      return Math.round(number.doubleValue());
    }
    return 0L;
  }

  private static String paymentLabel(List<SalesInvoicePayment> payments) {
    if (payments == null || payments.isEmpty()) {
      return "Cash";
    }
    PaymentMode primary =
        payments.stream()
            .sorted((a, b) -> Integer.compare(a.getSortOrder(), b.getSortOrder()))
            .map(SalesInvoicePayment::getMode)
            .findFirst()
            .orElse(PaymentMode.CASH);
    return switch (primary) {
      case CASH -> "Cash";
      case UPI -> "UPI";
      case CARD -> "Card";
      case BANK_TRANSFER -> "Bank";
      case CREDIT -> "Khata";
    };
  }

  private static ApiException forbidden() {
    return new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Forbidden");
  }

  private record SaleAgg(
      int orderCount, long lifetimePaise, Instant lastVisitAt, long loyaltyEarned) {
    static SaleAgg empty() {
      return new SaleAgg(0, 0L, null, 0L);
    }
  }
}
