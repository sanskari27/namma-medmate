package com.nammamedmate.server.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "hospital_credit_account")
@Getter
@Setter
public class HospitalCreditAccount {

  @Id private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "institution_name", nullable = false, length = 200)
  private String institutionName;

  @Column(length = 20)
  private String gstin;

  @Column(name = "stores_contact", length = 200)
  private String storesContact;

  @Column(name = "billing_phone", length = 32)
  private String billingPhone;

  @Column(name = "billing_email", length = 200)
  private String billingEmail;

  @Enumerated(EnumType.STRING)
  @Column(name = "credit_terms", nullable = false, length = 32)
  private HospitalCreditTerms creditTerms;

  @Column(name = "credit_limit_paise", nullable = false)
  private long creditLimitPaise;

  @Column(name = "uniform_discount_bps", nullable = false)
  private int uniformDiscountBps;

  @Column(name = "balance_paise", nullable = false)
  private long balancePaise;

  @Column(name = "price_list_approval_request_id")
  private UUID priceListApprovalRequestId;

  @Column(nullable = false)
  private long version;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;
}
