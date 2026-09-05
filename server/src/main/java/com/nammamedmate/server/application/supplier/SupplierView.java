package com.nammamedmate.server.application.supplier;

import com.nammamedmate.server.domain.DrugLicenseType;
import com.nammamedmate.server.domain.SupplierLicenseStatus;
import com.nammamedmate.server.domain.SupplierPaymentTerms;
import com.nammamedmate.server.domain.SupplierStatus;
import com.nammamedmate.server.domain.SupplierType;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record SupplierView(
    UUID id,
    UUID tenantId,
    String supplierCode,
    String legalName,
    String tradeName,
    SupplierType supplierType,
    String gstin,
    String pan,
    String drugLicenseNumber,
    DrugLicenseType drugLicenseType,
    LocalDate drugLicenseExpiry,
    String fssaiLicenseNumber,
    SupplierLicenseStatus licenseStatus,
    String contactPersonName,
    String contactPersonRole,
    String phone,
    String alternatePhone,
    String email,
    String website,
    String addressLine1,
    String addressLine2,
    String city,
    String state,
    String pincode,
    String country,
    SupplierPaymentTerms paymentTerms,
    Integer creditPeriodDays,
    Long creditLimitPaise,
    String bankName,
    String accountHolderName,
    String accountNumber,
    String ifscCode,
    String upiId,
    List<UUID> categoryIds,
    SupplierStatus status,
    String notes,
    Instant createdAt,
    Instant updatedAt,
    BranchProcurementView branchProcurement) {

  public record PurchaseOrderSummary(UUID id, String poNumber, Instant placedAt) {}

  public record BranchProcurementView(
      UUID branchId, String branchName, List<PurchaseOrderSummary> purchaseOrders) {}
}
