package com.nammamedmate.server.application.branch;

import com.nammamedmate.server.domain.BranchStatus;
import com.nammamedmate.server.domain.BranchType;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

public record BranchView(
    UUID id,
    UUID tenantId,
    String name,
    String branchCode,
    String addressLine,
    String city,
    String state,
    String pincode,
    String contactPhone,
    String contactEmail,
    String drugLicenseNumber,
    String gstin,
    Map<String, Object> operatingHours,
    BranchType branchType,
    BranchStatus status,
    LocalDate openingDate,
    boolean defaultBranch,
    boolean linkedWarehouse,
    Map<String, Object> pricingSettings,
    Map<String, Object> taxSettings,
    Instant createdAt,
    Instant updatedAt) {}
