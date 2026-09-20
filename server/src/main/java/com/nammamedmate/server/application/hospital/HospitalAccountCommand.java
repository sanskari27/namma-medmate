package com.nammamedmate.server.application.hospital;

public record HospitalAccountCommand(
    String institutionName,
    String gstin,
    String storesContact,
    String billingPhone,
    String billingEmail,
    String creditTerms,
    Long creditLimitPaise,
    Long expectedVersion) {}
