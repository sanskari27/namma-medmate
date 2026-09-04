package com.nammamedmate.server.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "location")
@Getter
@Setter
public class Location {

  @Id private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(nullable = false)
  private String name;

  @Column(name = "branch_code", nullable = false)
  private String branchCode;

  @Column(name = "address_line")
  private String addressLine;

  private String city;

  private String state;

  private String pincode;

  @Column(name = "contact_phone")
  private String contactPhone;

  @Column(name = "contact_email")
  private String contactEmail;

  @Column(name = "drug_license_number", nullable = false)
  private String drugLicenseNumber;

  private String gstin;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "operating_hours", nullable = false, columnDefinition = "jsonb")
  private Map<String, Object> operatingHours = new LinkedHashMap<>();

  @Enumerated(EnumType.STRING)
  @Column(name = "branch_type", nullable = false)
  private BranchType branchType;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private BranchStatus status;

  @Column(name = "opening_date", nullable = false)
  private LocalDate openingDate;

  @Column(name = "is_default", nullable = false)
  private boolean defaultBranch;

  @Column(name = "linked_warehouse", nullable = false)
  private boolean linkedWarehouse;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "pricing_settings", nullable = false, columnDefinition = "jsonb")
  private Map<String, Object> pricingSettings = new LinkedHashMap<>();

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "tax_settings", nullable = false, columnDefinition = "jsonb")
  private Map<String, Object> taxSettings = new LinkedHashMap<>();

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "inventory_settings", nullable = false, columnDefinition = "jsonb")
  private Map<String, Object> inventorySettings = new LinkedHashMap<>();

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  @Column(name = "deleted_at")
  private Instant deletedAt;
}
