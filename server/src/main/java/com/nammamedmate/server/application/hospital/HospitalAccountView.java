package com.nammamedmate.server.application.hospital;

import com.nammamedmate.server.domain.HospitalCreditTerms;
import java.util.UUID;

public record HospitalAccountView(
    boolean configured,
    UUID id,
    String institutionName,
    String gstin,
    String storesContact,
    String billingPhone,
    String billingEmail,
    HospitalCreditTerms creditTerms,
    long creditLimitPaise,
    long balancePaise,
    long availableCreditPaise,
    int uniformDiscountBps,
    UUID pendingPriceListApprovalRequestId,
    long version) {}
