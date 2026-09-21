package com.nammamedmate.server.application.hospital;

import com.nammamedmate.server.domain.HospitalActivePatientKind;
import com.nammamedmate.server.domain.HospitalAdmissionStatus;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record HospitalActivePatientDetailView(
    HospitalActivePatientKind kind,
    UUID admissionId,
    String uhid,
    String patientName,
    String wardName,
    String bedLabel,
    String locationLabel,
    HospitalAdmissionStatus status,
    Instant admittedAt,
    Instant dischargedAt,
    long version,
    long unpaidPaise,
    long settledPaise,
    int billCount,
    List<HospitalActivePatientInvoiceView> invoices) {}
