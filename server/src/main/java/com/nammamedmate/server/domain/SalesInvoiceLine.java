package com.nammamedmate.server.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "sales_invoice_line")
@Getter
@Setter
public class SalesInvoiceLine {

  @Id private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "branch_id", nullable = false)
  private UUID branchId;

  @Column(name = "sales_invoice_id", nullable = false)
  private UUID salesInvoiceId;

  @Column(name = "product_id", nullable = false)
  private UUID productId;

  @Column(name = "product_name", nullable = false, length = 200)
  private String productName;

  @Column(nullable = false, length = 64)
  private String sku;

  @Column(name = "batch_id")
  private UUID batchId;

  @Column(name = "batch_number", length = 64)
  private String batchNumber;

  @Column(name = "expires_on")
  private LocalDate expiresOn;

  @Column(nullable = false, precision = 19, scale = 6)
  private BigDecimal quantity;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 32)
  private ProductUnit unit;

  @Column(name = "base_quantity", nullable = false, precision = 19, scale = 6)
  private BigDecimal baseQuantity;

  @Column(name = "prescribed_quantity", precision = 19, scale = 6)
  private BigDecimal prescribedQuantity;

  @Column(name = "mrp_paise", nullable = false)
  private long mrpPaise;

  @Column(name = "selling_price_paise", nullable = false)
  private long sellingPricePaise;

  @Column(name = "discount_paise", nullable = false)
  private long discountPaise;

  @Enumerated(EnumType.STRING)
  @Column(name = "discount_type", nullable = false, length = 16)
  private DiscountType discountType = DiscountType.FLAT;

  @Column(name = "discount_value", nullable = false)
  private long discountValue;

  @Column(name = "bill_discount_paise", nullable = false)
  private long billDiscountPaise;

  @Column(name = "hsn_code", length = 16)
  private String hsnCode;

  @Column(name = "tax_category", length = 64)
  private String taxCategory;

  @Column(name = "gst_rate", precision = 5, scale = 2)
  private BigDecimal gstRate;

  @Enumerated(EnumType.STRING)
  @Column(name = "gst_rate_source", nullable = false, length = 16)
  private GstRateSource gstRateSource = GstRateSource.PRODUCT;

  @Column(name = "original_gst_rate", precision = 5, scale = 2)
  private BigDecimal originalGstRate;

  @Column(name = "cgst_paise", nullable = false)
  private long cgstPaise;

  @Column(name = "sgst_paise", nullable = false)
  private long sgstPaise;

  @Column(name = "igst_paise", nullable = false)
  private long igstPaise;

  @Column(name = "line_taxable_paise", nullable = false)
  private long lineTaxablePaise;

  @Column(name = "line_tax_paise", nullable = false)
  private long lineTaxPaise;

  @Column(name = "line_total_paise", nullable = false)
  private long lineTotalPaise;

  @Column(name = "sort_order", nullable = false)
  private int sortOrder;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;
}
