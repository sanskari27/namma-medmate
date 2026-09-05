package com.nammamedmate.server.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "controlled_sale_register")
@Getter
@Setter
public class ControlledSaleRegister {

  @Id private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "branch_id", nullable = false)
  private UUID branchId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 16)
  private ControlledSaleKind kind;

  @Column(name = "product_id", nullable = false)
  private UUID productId;

  @Column(name = "product_name", nullable = false, length = 200)
  private String productName;

  @Column(nullable = false, length = 64)
  private String sku;

  @Enumerated(EnumType.STRING)
  @Column(name = "schedule_classification", length = 16)
  private ScheduleClassification scheduleClassification;

  @Column(name = "batch_id")
  private UUID batchId;

  @Column(name = "batch_number", nullable = false, length = 64)
  private String batchNumber;

  @Column(nullable = false, precision = 19, scale = 6)
  private BigDecimal quantity;

  @Column(name = "prescription_reference", nullable = false, length = 64)
  private String prescriptionReference;

  @Column(name = "patient_id", nullable = false)
  private UUID patientId;

  @Column(name = "patient_name", nullable = false, length = 200)
  private String patientName;

  @Column(name = "pharmacist_user_id", nullable = false)
  private UUID pharmacistUserId;

  @Column(name = "pharmacist_name", nullable = false, length = 200)
  private String pharmacistName;

  @Column(name = "pharmacist_registration", length = 64)
  private String pharmacistRegistration;

  @Column(name = "occurred_at", nullable = false)
  private Instant occurredAt;

  @Column(name = "sales_invoice_id", nullable = false)
  private UUID salesInvoiceId;

  @Column(name = "sales_invoice_line_id", nullable = false)
  private UUID salesInvoiceLineId;

  @Column(name = "sales_return_id")
  private UUID salesReturnId;

  @Column(name = "sales_return_line_id")
  private UUID salesReturnLineId;

  @Column(name = "source_register_id")
  private UUID sourceRegisterId;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;
}
