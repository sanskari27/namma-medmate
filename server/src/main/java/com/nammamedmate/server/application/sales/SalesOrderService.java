package com.nammamedmate.server.application.sales;

import com.nammamedmate.server.application.access.AccessQueryService;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.Customer;
import com.nammamedmate.server.domain.ModuleCode;
import com.nammamedmate.server.domain.PaymentMode;
import com.nammamedmate.server.domain.SalesInvoice;
import com.nammamedmate.server.domain.SalesInvoiceLine;
import com.nammamedmate.server.domain.SalesInvoicePayment;
import com.nammamedmate.server.domain.SalesOrderChannel;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.CustomerRepository;
import com.nammamedmate.server.persistence.SalesInvoiceLineRepository;
import com.nammamedmate.server.persistence.SalesInvoicePaymentRepository;
import com.nammamedmate.server.persistence.SalesInvoiceRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SalesOrderService {

  private static final String NO_BRANCH_CODE = "NO_ACTIVE_BRANCH";
  private static final String NO_BRANCH_MESSAGE = "Select an outlet before opening Orders.";

  private final SalesInvoiceRepository salesInvoiceRepository;
  private final SalesInvoiceLineRepository salesInvoiceLineRepository;
  private final SalesInvoicePaymentRepository salesInvoicePaymentRepository;
  private final CustomerRepository customerRepository;
  private final AppUserRepository appUserRepository;
  private final AccessQueryService accessQueryService;

  public SalesOrderService(
      SalesInvoiceRepository salesInvoiceRepository,
      SalesInvoiceLineRepository salesInvoiceLineRepository,
      SalesInvoicePaymentRepository salesInvoicePaymentRepository,
      CustomerRepository customerRepository,
      AppUserRepository appUserRepository,
      AccessQueryService accessQueryService) {
    this.salesInvoiceRepository = salesInvoiceRepository;
    this.salesInvoiceLineRepository = salesInvoiceLineRepository;
    this.salesInvoicePaymentRepository = salesInvoicePaymentRepository;
    this.customerRepository = customerRepository;
    this.appUserRepository = appUserRepository;
    this.accessQueryService = accessQueryService;
  }

  @Transactional(readOnly = true)
  public SalesOrderListView list(AuthPrincipal principal) {
    UUID tenantId = requireSalesAccess(principal);
    UUID branchId = principal.activeBranchId();
    if (branchId == null) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, NO_BRANCH_CODE, NO_BRANCH_MESSAGE);
    }

    List<SalesInvoice> invoices =
        salesInvoiceRepository.findByTenantIdAndBranchIdOrderByCreatedAtDesc(tenantId, branchId);
    if (invoices.isEmpty()) {
      return new SalesOrderListView(List.of());
    }

    List<UUID> invoiceIds = invoices.stream().map(SalesInvoice::getId).toList();

    Map<UUID, List<SalesInvoiceLine>> linesByInvoice = new HashMap<>();
    for (SalesInvoiceLine line :
        salesInvoiceLineRepository.findAllByTenantIdAndBranchIdAndSalesInvoiceIdIn(
            tenantId, branchId, invoiceIds)) {
      linesByInvoice
          .computeIfAbsent(line.getSalesInvoiceId(), ignored -> new ArrayList<>())
          .add(line);
    }

    Map<UUID, List<SalesInvoicePayment>> paymentsByInvoice = new HashMap<>();
    for (SalesInvoicePayment payment :
        salesInvoicePaymentRepository.findAllByTenantIdAndSalesInvoiceIdIn(tenantId, invoiceIds)) {
      paymentsByInvoice
          .computeIfAbsent(payment.getSalesInvoiceId(), ignored -> new ArrayList<>())
          .add(payment);
    }

    Set<UUID> customerIds =
        invoices.stream()
            .map(SalesInvoice::getCustomerId)
            .filter(Objects::nonNull)
            .collect(Collectors.toCollection(LinkedHashSet::new));
    Map<UUID, Customer> customers = new HashMap<>();
    if (!customerIds.isEmpty()) {
      for (Customer customer : customerRepository.findAllByTenantIdAndIdIn(tenantId, customerIds)) {
        customers.put(customer.getId(), customer);
      }
    }

    List<SalesOrderRowView> items =
        invoices.stream()
            .map(
                invoice ->
                    toRow(
                        invoice,
                        linesByInvoice.getOrDefault(invoice.getId(), List.of()),
                        paymentsByInvoice.getOrDefault(invoice.getId(), List.of()),
                        invoice.getCustomerId() == null
                            ? null
                            : customers.get(invoice.getCustomerId())))
            .toList();

    return new SalesOrderListView(items);
  }

  private static SalesOrderRowView toRow(
      SalesInvoice invoice,
      List<SalesInvoiceLine> lines,
      List<SalesInvoicePayment> payments,
      Customer customer) {
    List<SalesInvoiceLine> ordered =
        lines.stream().sorted(Comparator.comparingInt(SalesInvoiceLine::getSortOrder)).toList();
    List<SalesInvoicePayment> orderedPayments =
        payments.stream()
            .sorted(Comparator.comparingInt(SalesInvoicePayment::getSortOrder))
            .toList();

    int itemUnitCount =
        ordered.stream()
            .map(SalesInvoiceLine::getQuantity)
            .filter(Objects::nonNull)
            .map(qty -> qty.setScale(0, RoundingMode.HALF_UP).intValue())
            .reduce(0, Integer::sum);

    String itemSummary =
        ordered.stream()
            .map(SalesInvoiceLine::getProductName)
            .filter(name -> name != null && !name.isBlank())
            .limit(2)
            .collect(Collectors.joining(", "));

    String customerName = customer == null ? "Walk-in" : blankToNull(customer.getName());
    if (customerName == null) {
      customerName = "Walk-in";
    }

    return new SalesOrderRowView(
        invoice.getId(),
        invoice.getInvoiceNumber(),
        invoice.getStatus(),
        SalesOrderChannel.COUNTER,
        invoice.getCustomerId(),
        customerName,
        customer == null ? null : blankToNull(customer.getPhone()),
        customer == null ? null : blankToNull(customer.getAddress()),
        invoice.getPrescriptionReference() != null && !invoice.getPrescriptionReference().isBlank(),
        blankToNull(invoice.getPrescriptionReference()),
        invoice.isPrescriptionVerified(),
        invoice.getPrescriptionAttachmentStorageKey() != null
            && !invoice.getPrescriptionAttachmentStorageKey().isBlank(),
        blankToNull(invoice.getPrescriptionAttachmentFilename()),
        blankToNull(invoice.getPrescriptionAttachmentContentType()),
        itemUnitCount,
        ordered.size(),
        itemSummary,
        paymentLabel(orderedPayments, invoice.getAmountDuePaise()),
        invoice.getAmountPaidPaise(),
        invoice.getAmountDuePaise(),
        invoice.getSubtotalPaise(),
        invoice.getTaxPaise(),
        invoice.getTotalPaise(),
        invoice.getCreatedAt(),
        invoice.getCompletedAt(),
        invoice.getUpdatedAt(),
        orderedPayments.stream()
            .map(
                payment ->
                    new SalesOrderRowView.PaymentView(
                        payment.getMode(), payment.getAmountPaise(), payment.getReference()))
            .toList(),
        ordered.stream()
            .map(
                line ->
                    new SalesOrderRowView.LineView(
                        line.getId(),
                        line.getProductName(),
                        line.getBatchNumber(),
                        line.getQuantity(),
                        line.getSellingPricePaise(),
                        line.getLineTotalPaise()))
            .toList());
  }

  private static String paymentLabel(List<SalesInvoicePayment> payments, long amountDuePaise) {
    if (payments.isEmpty()) {
      return amountDuePaise > 0 ? null : null;
    }
    LinkedHashSet<String> labels = new LinkedHashSet<>();
    for (SalesInvoicePayment payment : payments) {
      labels.add(modeLabel(payment.getMode()));
    }
    return String.join(" + ", labels);
  }

  private static String modeLabel(PaymentMode mode) {
    if (mode == null) {
      return "Other";
    }
    return switch (mode) {
      case CASH -> "Cash";
      case CARD -> "Card";
      case UPI -> "UPI";
      case CREDIT -> "Khata / Credit";
      case BANK_TRANSFER -> "Bank transfer";
    };
  }

  private static String blankToNull(String value) {
    if (value == null) {
      return null;
    }
    String trimmed = value.trim();
    return trimmed.isEmpty() ? null : trimmed;
  }

  private UUID requireSalesAccess(AuthPrincipal principal) {
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
            .orElseThrow(SalesOrderService::forbidden);
    if (!accessQueryService.effectiveModules(user).contains(ModuleCode.SALES)) {
      throw forbidden();
    }
    return principal.tenantId();
  }

  private static ApiException forbidden() {
    return new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Forbidden");
  }
}
