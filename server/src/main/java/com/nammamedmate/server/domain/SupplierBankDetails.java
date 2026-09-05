package com.nammamedmate.server.domain;

public record SupplierBankDetails(
    String bankName,
    String accountHolderName,
    String accountNumber,
    String ifscCode,
    String upiId) {}
