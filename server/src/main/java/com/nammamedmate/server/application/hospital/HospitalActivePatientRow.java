package com.nammamedmate.server.application.hospital;

import com.nammamedmate.server.domain.HospitalActivePatientKind;
import com.nammamedmate.server.domain.HospitalAdmissionStatus;
import java.util.UUID;

public record HospitalActivePatientRow(
    HospitalActivePatientKind kind,
    UUID admissionId,
    String uhid,
    String patientName,
    String wardName,
    String locationLabel,
    long unpaidPaise,
    long settledPaise,
    int billCount,
    HospitalAdmissionStatus status,
    long version) {}
