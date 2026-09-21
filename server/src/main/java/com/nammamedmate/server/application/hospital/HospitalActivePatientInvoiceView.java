package com.nammamedmate.server.application.hospital;

import java.time.Instant;
import java.util.UUID;

public record HospitalActivePatientInvoiceView(
    UUID id,
    String invoiceNumber,
    Instant completedAt,
    String saleSource,
    int itemCount,
    String paymentLabel,
    String status,
    long totalPaise,
    long amountDuePaise,
    long amountPaidPaise,
    String insurerName,
    String policyNumber) {}
