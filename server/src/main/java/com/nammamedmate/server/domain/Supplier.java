package com.nammamedmate.server.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "supplier")
@Getter
@Setter
public class Supplier {

  @Id private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "supplier_code", nullable = false, length = 32)
  private String supplierCode;

  @Column(name = "legal_name", nullable = false, length = 200)
  private String legalName;

  @Column(name = "trade_name", length = 200)
  private String tradeName;

  @Enumerated(EnumType.STRING)
  @Column(name = "supplier_type", nullable = false, length = 32)
  private SupplierType supplierType;

  @Column(length = 15)
  private String gstin;

  @Column(length = 10)
  private String pan;

  @Column(name = "drug_license_number", length = 64)
  private String drugLicenseNumber;

  @Enumerated(EnumType.STRING)
  @Column(name = "drug_license_type", length = 32)
  private DrugLicenseType drugLicenseType;

  @Column(name = "drug_license_expiry")
  private LocalDate drugLicenseExpiry;

  @Column(name = "fssai_license_number", length = 64)
  private String fssaiLicenseNumber;

  @Column(name = "contact_person_name", nullable = false, length = 120)
  private String contactPersonName;

  @Column(name = "contact_person_role", length = 80)
  private String contactPersonRole;

  @Column(nullable = false, length = 32)
  private String phone;

  @Column(name = "alternate_phone", length = 32)
  private String alternatePhone;

  @Column(length = 200)
  private String email;

  @Column(length = 200)
  private String website;

  @Column(name = "address_line_1", nullable = false, length = 200)
  private String addressLine1;

  @Column(name = "address_line_2", length = 200)
  private String addressLine2;

  @Column(nullable = false, length = 80)
  private String city;

  @Column(nullable = false, length = 80)
  private String state;

  @Column(nullable = false, length = 16)
  private String pincode;

  @Column(nullable = false, length = 80)
  private String country;

  @Enumerated(EnumType.STRING)
  @Column(name = "payment_terms", nullable = false, length = 16)
  private SupplierPaymentTerms paymentTerms;

  @Column(name = "credit_period_days")
  private Integer creditPeriodDays;

  @Column(name = "credit_limit_paise")
  private Long creditLimitPaise;

  @Column(name = "bank_name", length = 120)
  private String bankName;

  @Column(name = "account_holder_name", length = 120)
  private String accountHolderName;

  @Column(name = "account_number", length = 32)
  private String accountNumber;

  @Column(name = "ifsc_code", length = 11)
  private String ifscCode;

  @Column(name = "upi_id", length = 120)
  private String upiId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 16)
  private SupplierStatus status;

  @Column(columnDefinition = "TEXT")
  private String notes;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;
}
