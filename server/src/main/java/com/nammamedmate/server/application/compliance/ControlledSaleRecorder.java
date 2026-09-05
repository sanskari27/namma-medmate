package com.nammamedmate.server.application.compliance;

import com.nammamedmate.server.domain.ControlledSaleKind;
import com.nammamedmate.server.domain.ControlledSalePolicy;
import com.nammamedmate.server.domain.ControlledSaleRegister;
import com.nammamedmate.server.domain.ControlledStockPolicy;
import com.nammamedmate.server.domain.Customer;
import com.nammamedmate.server.domain.Product;
import com.nammamedmate.server.domain.SalesInvoice;
import com.nammamedmate.server.domain.SalesInvoiceLine;
import com.nammamedmate.server.domain.SalesReturnLine;
import com.nammamedmate.server.persistence.ControlledSaleRegisterRepository;
import com.nammamedmate.server.persistence.CustomerRepository;
import com.nammamedmate.server.persistence.ProductRepository;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Component;

@Component
public class ControlledSaleRecorder {

  private final ControlledSaleRegisterRepository controlledSaleRegisterRepository;
  private final CustomerRepository customerRepository;
  private final ProductRepository productRepository;

  public ControlledSaleRecorder(
      ControlledSaleRegisterRepository controlledSaleRegisterRepository,
      CustomerRepository customerRepository,
      ProductRepository productRepository) {
    this.controlledSaleRegisterRepository = controlledSaleRegisterRepository;
    this.customerRepository = customerRepository;
    this.productRepository = productRepository;
  }

  public void recordCompletedInvoice(SalesInvoice invoice, List<SalesInvoiceLine> lines) {
    if (invoice == null || lines == null || lines.isEmpty()) {
      return;
    }
    Instant occurredAt = invoice.getCompletedAt();
    String patientName = patientName(invoice);
    for (SalesInvoiceLine line : lines) {
      if (!controlledLine(invoice.getTenantId(), line)) {
        continue;
      }
      if (controlledSaleRegisterRepository
          .findByTenantIdAndSalesInvoiceLineIdAndKind(
              invoice.getTenantId(), line.getId(), ControlledSaleKind.SALE)
          .isPresent()) {
        continue;
      }
      ControlledSalePolicy.requireSaleFact(
          line.getProductName(),
          line.getBaseQuantity(),
          line.getBatchNumber(),
          invoice.getPrescriptionReference(),
          patientName,
          invoice.getPharmacistName(),
          occurredAt);
      ControlledSaleRegister row = new ControlledSaleRegister();
      row.setId(UUID.randomUUID());
      row.setTenantId(invoice.getTenantId());
      row.setBranchId(invoice.getBranchId());
      row.setKind(ControlledSaleKind.SALE);
      row.setProductId(line.getProductId());
      row.setProductName(line.getProductName());
      row.setSku(line.getSku());
      row.setScheduleClassification(line.getScheduleClassification());
      row.setBatchId(line.getBatchId());
      row.setBatchNumber(line.getBatchNumber());
      row.setQuantity(line.getBaseQuantity());
      row.setPrescriptionReference(invoice.getPrescriptionReference().trim());
      row.setPatientId(invoice.getCustomerId());
      row.setPatientName(patientName);
      row.setPharmacistUserId(invoice.getStaffUserId());
      row.setPharmacistName(invoice.getPharmacistName().trim());
      row.setPharmacistRegistration(blankToNull(invoice.getPharmacistRegistration()));
      row.setOccurredAt(occurredAt);
      row.setSalesInvoiceId(invoice.getId());
      row.setSalesInvoiceLineId(line.getId());
      row.setCreatedAt(occurredAt);
      saveIgnoringDuplicate(row);
    }
  }

  public void recordReturn(SalesInvoice invoice, List<SalesReturnLine> lines, Instant occurredAt) {
    if (invoice == null || lines == null || lines.isEmpty() || occurredAt == null) {
      return;
    }
    for (SalesReturnLine line : lines) {
      if (!controlledProduct(invoice.getTenantId(), line.getProductId())) {
        continue;
      }
      if (controlledSaleRegisterRepository
          .findByTenantIdAndSalesReturnLineIdAndKind(
              invoice.getTenantId(), line.getId(), ControlledSaleKind.RETURN)
          .isPresent()) {
        continue;
      }
      ControlledSaleRegister source =
          controlledSaleRegisterRepository
              .findByTenantIdAndSalesInvoiceLineIdAndKind(
                  invoice.getTenantId(), line.getSalesInvoiceLineId(), ControlledSaleKind.SALE)
              .orElseThrow(ControlledSalePolicy::incomplete);
      ControlledSalePolicy.requireReturnFact(source.getId(), line.getQuantity(), occurredAt);
      ControlledSaleRegister row = new ControlledSaleRegister();
      row.setId(UUID.randomUUID());
      row.setTenantId(source.getTenantId());
      row.setBranchId(source.getBranchId());
      row.setKind(ControlledSaleKind.RETURN);
      row.setProductId(source.getProductId());
      row.setProductName(source.getProductName());
      row.setSku(source.getSku());
      row.setScheduleClassification(source.getScheduleClassification());
      row.setBatchId(source.getBatchId());
      row.setBatchNumber(source.getBatchNumber());
      row.setQuantity(line.getQuantity());
      row.setPrescriptionReference(source.getPrescriptionReference());
      row.setPatientId(source.getPatientId());
      row.setPatientName(source.getPatientName());
      row.setPharmacistUserId(source.getPharmacistUserId());
      row.setPharmacistName(source.getPharmacistName());
      row.setPharmacistRegistration(source.getPharmacistRegistration());
      row.setOccurredAt(occurredAt);
      row.setSalesInvoiceId(source.getSalesInvoiceId());
      row.setSalesInvoiceLineId(source.getSalesInvoiceLineId());
      row.setSalesReturnId(line.getSalesReturnId());
      row.setSalesReturnLineId(line.getId());
      row.setSourceRegisterId(source.getId());
      row.setCreatedAt(occurredAt);
      saveIgnoringDuplicate(row);
    }
  }

  private boolean controlledLine(UUID tenantId, SalesInvoiceLine line) {
    if (ControlledStockPolicy.isControlled(
        line.getScheduleClassification(), line.isControlledSubstance())) {
      return true;
    }
    return controlledProduct(tenantId, line.getProductId());
  }

  private boolean controlledProduct(UUID tenantId, UUID productId) {
    Product product = productRepository.findByIdAndTenantId(productId, tenantId).orElse(null);
    return ControlledStockPolicy.isControlled(product);
  }

  private String patientName(SalesInvoice invoice) {
    if (invoice.getCustomerId() == null) {
      return null;
    }
    return customerRepository
        .findByIdAndTenantIdAndDeletedAtIsNull(invoice.getCustomerId(), invoice.getTenantId())
        .map(Customer::getName)
        .orElse(null);
  }

  private void saveIgnoringDuplicate(ControlledSaleRegister row) {
    try {
      controlledSaleRegisterRepository.saveAndFlush(row);
    } catch (DataIntegrityViolationException ex) {
      // Unique sale/return line keys make complete/return replay a no-op.
    }
  }

  private static String blankToNull(String value) {
    if (value == null || value.isBlank()) {
      return null;
    }
    return value.trim();
  }
}
