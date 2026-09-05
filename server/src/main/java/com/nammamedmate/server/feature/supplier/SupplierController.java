package com.nammamedmate.server.feature.supplier;

import com.nammamedmate.server.application.supplier.SupplierCommand;
import com.nammamedmate.server.application.supplier.SupplierService;
import com.nammamedmate.server.application.supplier.SupplierView;
import com.nammamedmate.server.domain.DrugLicenseType;
import com.nammamedmate.server.domain.SupplierLicenseStatus;
import com.nammamedmate.server.domain.SupplierPaymentTerms;
import com.nammamedmate.server.domain.SupplierStatus;
import com.nammamedmate.server.domain.SupplierType;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.shared.web.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/suppliers")
public class SupplierController {

  private final SupplierService supplierService;

  public SupplierController(SupplierService supplierService) {
    this.supplierService = supplierService;
  }

  @GetMapping
  public ApiResponse<SupplierListResponse> list(
      Authentication authentication, @RequestParam(required = false) String q) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        new SupplierListResponse(
            supplierService.list(principal, q).stream().map(this::toResponse).toList()));
  }

  @GetMapping("/{id}")
  public ApiResponse<SupplierResponse> get(Authentication authentication, @PathVariable UUID id) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toResponse(supplierService.get(principal, id)));
  }

  @PostMapping
  public ApiResponse<SupplierResponse> create(
      Authentication authentication, @Valid @RequestBody UpsertSupplierRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toResponse(supplierService.create(principal, toCommand(request))));
  }

  @PatchMapping("/{id}")
  public ApiResponse<SupplierResponse> update(
      Authentication authentication,
      @PathVariable UUID id,
      @Valid @RequestBody UpsertSupplierRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toResponse(supplierService.update(principal, id, toCommand(request))));
  }

  private SupplierResponse toResponse(SupplierView view) {
    return new SupplierResponse(
        view.id(),
        view.tenantId(),
        view.supplierCode(),
        view.legalName(),
        view.tradeName(),
        view.supplierType(),
        view.gstin(),
        view.pan(),
        view.drugLicenseNumber(),
        view.drugLicenseType(),
        view.drugLicenseExpiry(),
        view.fssaiLicenseNumber(),
        view.licenseStatus(),
        view.contactPersonName(),
        view.contactPersonRole(),
        view.phone(),
        view.alternatePhone(),
        view.email(),
        view.website(),
        view.addressLine1(),
        view.addressLine2(),
        view.city(),
        view.state(),
        view.pincode(),
        view.country(),
        view.paymentTerms(),
        view.creditPeriodDays(),
        view.creditLimitPaise(),
        view.bankName(),
        view.accountHolderName(),
        view.accountNumber(),
        view.ifscCode(),
        view.upiId(),
        view.categoryIds(),
        view.status(),
        view.notes(),
        view.createdAt(),
        view.updatedAt(),
        new BranchProcurementResponse(
            view.branchProcurement().branchId(),
            view.branchProcurement().branchName(),
            view.branchProcurement().purchaseOrders().stream()
                .map(po -> new PurchaseOrderSummaryResponse(po.id(), po.poNumber(), po.placedAt()))
                .toList()));
  }

  private static SupplierCommand toCommand(UpsertSupplierRequest request) {
    return new SupplierCommand(
        request.supplierCode(),
        request.legalName(),
        request.tradeName(),
        request.supplierType(),
        request.gstin(),
        request.pan(),
        request.drugLicenseNumber(),
        request.drugLicenseType(),
        request.drugLicenseExpiry(),
        request.fssaiLicenseNumber(),
        request.contactPersonName(),
        request.contactPersonRole(),
        request.phone(),
        request.alternatePhone(),
        request.email(),
        request.website(),
        request.addressLine1(),
        request.addressLine2(),
        request.city(),
        request.state(),
        request.pincode(),
        request.country(),
        request.paymentTerms(),
        request.creditPeriodDays(),
        request.creditLimitPaise(),
        request.bankName(),
        request.accountHolderName(),
        request.accountNumber(),
        request.confirmAccountNumber(),
        request.ifscCode(),
        request.upiId(),
        request.categoryIds(),
        request.status(),
        request.notes());
  }

  public record SupplierListResponse(List<SupplierResponse> items) {}

  public record PurchaseOrderSummaryResponse(UUID id, String poNumber, Instant placedAt) {}

  public record BranchProcurementResponse(
      UUID branchId, String branchName, List<PurchaseOrderSummaryResponse> purchaseOrders) {}

  public record SupplierResponse(
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
      BranchProcurementResponse branchProcurement) {}

  public record UpsertSupplierRequest(
      @NotBlank @Size(max = 32) String supplierCode,
      @NotBlank @Size(max = 200) String legalName,
      @Size(max = 200) String tradeName,
      @NotNull SupplierType supplierType,
      @Size(max = 15) String gstin,
      @Size(max = 10) String pan,
      @Size(max = 64) String drugLicenseNumber,
      DrugLicenseType drugLicenseType,
      LocalDate drugLicenseExpiry,
      @Size(max = 64) String fssaiLicenseNumber,
      @NotBlank @Size(max = 120) String contactPersonName,
      @Size(max = 80) String contactPersonRole,
      @NotBlank @Size(max = 32) String phone,
      @Size(max = 32) String alternatePhone,
      @Size(max = 200) String email,
      @Size(max = 200) String website,
      @NotBlank @Size(max = 200) String addressLine1,
      @Size(max = 200) String addressLine2,
      @NotBlank @Size(max = 80) String city,
      @NotBlank @Size(max = 80) String state,
      @NotBlank @Size(max = 16) String pincode,
      @Size(max = 80) String country,
      @NotNull SupplierPaymentTerms paymentTerms,
      Integer creditPeriodDays,
      Long creditLimitPaise,
      @Size(max = 120) String bankName,
      @Size(max = 120) String accountHolderName,
      @Size(max = 32) String accountNumber,
      @Size(max = 32) String confirmAccountNumber,
      @Size(max = 11) String ifscCode,
      @Size(max = 120) String upiId,
      List<UUID> categoryIds,
      @NotNull SupplierStatus status,
      String notes) {}
}
