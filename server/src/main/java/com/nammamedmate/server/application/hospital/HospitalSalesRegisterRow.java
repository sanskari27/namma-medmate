package com.nammamedmate.server.application.hospital;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record HospitalSalesRegisterRow(
    UUID id,
    String invoiceNumber,
    Instant completedAt,
    String saleSource,
    String uhid,
    UUID wardId,
    String wardName,
    String patientName,
    String phone,
    List<String> paymentModes,
    String insurerName,
    long totalPaise,
    long amountPaidPaise,
    long amountDuePaise,
    long insurancePaise) {}
