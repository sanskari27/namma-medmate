package com.nammamedmate.server.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "sales_invoice_sequence")
@Getter
@Setter
public class SalesInvoiceSequence {

  @Id private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "branch_id", nullable = false)
  private UUID branchId;

  @Column(name = "financial_year", nullable = false, length = 8)
  private String financialYear;

  @Column(name = "next_value", nullable = false)
  private int nextValue;
}
