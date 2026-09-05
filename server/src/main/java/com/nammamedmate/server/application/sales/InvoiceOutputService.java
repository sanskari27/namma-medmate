package com.nammamedmate.server.application.sales;

import com.nammamedmate.server.application.access.AccessQueryService;
import com.nammamedmate.server.application.email.SendEmailCommand;
import com.nammamedmate.server.application.email.SendEmailResult;
import com.nammamedmate.server.application.email.TransactionalEmailService;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.Customer;
import com.nammamedmate.server.domain.Doctor;
import com.nammamedmate.server.domain.EmailTemplate;
import com.nammamedmate.server.domain.InvoiceCopyPolicy;
import com.nammamedmate.server.domain.InvoicePdfPolicy;
import com.nammamedmate.server.domain.ModuleCode;
import com.nammamedmate.server.domain.SalesInvoice;
import com.nammamedmate.server.domain.SalesInvoiceLine;
import com.nammamedmate.server.domain.SalesInvoicePayment;
import com.nammamedmate.server.domain.SalesReturn;
import com.nammamedmate.server.infrastructure.pdf.InvoiceA4PdfRenderer;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.CustomerRepository;
import com.nammamedmate.server.persistence.DoctorRepository;
import com.nammamedmate.server.persistence.SalesInvoiceLineRepository;
import com.nammamedmate.server.persistence.SalesInvoicePaymentRepository;
import com.nammamedmate.server.persistence.SalesInvoiceRepository;
import com.nammamedmate.server.persistence.SalesReturnRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InvoiceOutputService {

  private static final String NO_BRANCH_CODE = "NO_ACTIVE_BRANCH";
  private static final String NO_BRANCH_MESSAGE = "Select an outlet before printing a till bill.";

  private final SalesInvoiceRepository salesInvoiceRepository;
  private final SalesInvoiceLineRepository salesInvoiceLineRepository;
  private final SalesInvoicePaymentRepository salesInvoicePaymentRepository;
  private final SalesReturnRepository salesReturnRepository;
  private final CustomerRepository customerRepository;
  private final DoctorRepository doctorRepository;
  private final AppUserRepository appUserRepository;
  private final AccessQueryService accessQueryService;
  private final TransactionalEmailService transactionalEmailService;
  private final InvoiceA4PdfRenderer invoiceA4PdfRenderer;

  public InvoiceOutputService(
      SalesInvoiceRepository salesInvoiceRepository,
      SalesInvoiceLineRepository salesInvoiceLineRepository,
      SalesInvoicePaymentRepository salesInvoicePaymentRepository,
      SalesReturnRepository salesReturnRepository,
      CustomerRepository customerRepository,
      DoctorRepository doctorRepository,
      AppUserRepository appUserRepository,
      AccessQueryService accessQueryService,
      TransactionalEmailService transactionalEmailService,
      InvoiceA4PdfRenderer invoiceA4PdfRenderer) {
    this.salesInvoiceRepository = salesInvoiceRepository;
    this.salesInvoiceLineRepository = salesInvoiceLineRepository;
    this.salesInvoicePaymentRepository = salesInvoicePaymentRepository;
    this.salesReturnRepository = salesReturnRepository;
    this.customerRepository = customerRepository;
    this.doctorRepository = doctorRepository;
    this.appUserRepository = appUserRepository;
    this.accessQueryService = accessQueryService;
    this.transactionalEmailService = transactionalEmailService;
    this.invoiceA4PdfRenderer = invoiceA4PdfRenderer;
  }

  @Transactional(readOnly = true)
  public InvoiceHealthView health(AuthPrincipal principal) {
    requireReady(principal);
    return new InvoiceHealthView("UP");
  }

  @Transactional(readOnly = true)
  public InvoicePdfBytes pdf(AuthPrincipal principal, UUID id) {
    Context ctx = requireReady(principal);
    SalesInvoice invoice = requireInvoice(id, ctx);
    InvoicePdfPolicy.assertCompleted(invoice.getStatus());
    List<SalesInvoiceLine> lines =
        salesInvoiceLineRepository.findAllBySalesInvoiceIdAndTenantIdAndBranchIdOrderBySortOrderAsc(
            invoice.getId(), invoice.getTenantId(), invoice.getBranchId());
    List<SalesInvoicePayment> payments =
        salesInvoicePaymentRepository
            .findAllBySalesInvoiceIdAndTenantIdAndBranchIdOrderBySortOrderAsc(
                invoice.getId(), invoice.getTenantId(), invoice.getBranchId());
    List<SalesReturn> returns =
        salesReturnRepository.findAllByTenantIdAndBranchIdAndSalesInvoiceIdOrderByCreatedAtAsc(
            invoice.getTenantId(), invoice.getBranchId(), invoice.getId());
    Customer customer =
        invoice.getCustomerId() == null
            ? null
            : customerRepository
                .findByIdAndTenantId(invoice.getCustomerId(), invoice.getTenantId())
                .orElse(null);
    Doctor doctor =
        invoice.getDoctorId() == null
            ? null
            : doctorRepository
                .findByIdAndTenantIdAndDeletedAtIsNull(invoice.getDoctorId(), invoice.getTenantId())
                .orElse(null);
    InvoicePdfDocument document =
        new InvoicePdfDocument(
            invoice.getPharmacyLegalName(),
            invoice.getPharmacyAddress(),
            invoice.getPharmacyPhone(),
            invoice.getPharmacyGstin(),
            invoice.getPharmacyPan(),
            invoice.getPharmacyDrugLicenseNumber(),
            invoice.getPharmacyDrugLicenseType(),
            invoice.getInvoiceNumber(),
            invoice.getCompletedAt() == null ? invoice.getCreatedAt() : invoice.getCompletedAt(),
            customer == null ? null : customer.getName(),
            customer == null ? null : customer.getAddress(),
            invoice.getCustomerGstin(),
            doctor == null ? null : doctor.getName(),
            doctor == null ? null : doctor.getRegistrationNumber(),
            invoice.getPrescriptionReference(),
            invoice.getPharmacistName(),
            invoice.getPharmacistRegistration(),
            lines.stream()
                .map(
                    line ->
                        new InvoicePdfDocument.Line(
                            line.getProductName(),
                            line.getBatchNumber(),
                            line.getExpiresOn(),
                            line.getQuantity(),
                            line.getUnit(),
                            line.getMrpPaise(),
                            line.getSellingPricePaise(),
                            line.getDiscountPaise(),
                            line.getHsnCode(),
                            line.getGstRate(),
                            line.getCgstPaise(),
                            line.getSgstPaise(),
                            line.getIgstPaise(),
                            line.getScheduleClassification(),
                            line.isControlledSubstance()))
                .toList(),
            invoice.getSubtotalPaise(),
            invoice.getTaxPaise(),
            invoice.getTotalPaise(),
            invoice.getCgstPaise(),
            invoice.getSgstPaise(),
            invoice.getIgstPaise(),
            payments.stream()
                .map(
                    payment ->
                        new InvoicePdfDocument.Payment(payment.getMode(), payment.getAmountPaise()))
                .toList(),
            returns.stream()
                .map(
                    row ->
                        new InvoicePdfDocument.ReturnNote(
                            row.getReason(), row.getRefundTotalPaise()))
                .toList());
    return new InvoicePdfBytes(
        invoice.getInvoiceNumber() + ".pdf", invoiceA4PdfRenderer.render(document));
  }

  @Transactional
  public InvoiceCopyView emailCopy(AuthPrincipal principal, UUID id) {
    Context ctx = requireReady(principal);
    SalesInvoice invoice = requireInvoice(id, ctx);
    InvoiceCopyPolicy.assertCompleted(invoice.getStatus());
    if (invoice.getCustomerId() == null) {
      InvoiceCopyPolicy.requireCustomerEmail(null);
    }
    Customer customer =
        customerRepository
            .findByIdAndTenantIdAndDeletedAtIsNull(invoice.getCustomerId(), invoice.getTenantId())
            .orElseThrow(
                () -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Invoice was not found"));
    String email = InvoiceCopyPolicy.requireCustomerEmail(customer.getEmail());
    SendEmailResult result =
        transactionalEmailService.send(
            new SendEmailCommand(
                EmailTemplate.INVOICE_COPY,
                email,
                invoice.getTenantId(),
                invoice.getPharmacyLegalName(),
                Map.of("invoiceNumber", invoice.getInvoiceNumber()),
                InvoiceCopyPolicy.idempotencyKey(invoice.getId())));
    return new InvoiceCopyView(
        result.id(),
        result.status(),
        result.replayed(),
        invoice.getInvoiceNumber());
  }

  private SalesInvoice requireInvoice(UUID id, Context ctx) {
    return salesInvoiceRepository
        .findByIdAndTenantIdAndBranchId(id, ctx.tenantId(), ctx.branchId())
        .orElseThrow(
            () -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Invoice was not found"));
  }

  private Context requireReady(AuthPrincipal principal) {
    UUID tenantId = requireSalesAccess(principal);
    UUID branchId = principal.activeBranchId();
    if (branchId == null) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, NO_BRANCH_CODE, NO_BRANCH_MESSAGE);
    }
    return new Context(tenantId, branchId);
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
            .orElseThrow(InvoiceOutputService::forbidden);
    if (!accessQueryService.effectiveModules(user).contains(ModuleCode.SALES)) {
      throw forbidden();
    }
    return principal.tenantId();
  }

  private static ApiException forbidden() {
    return new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Forbidden");
  }

  private record Context(UUID tenantId, UUID branchId) {}
}
