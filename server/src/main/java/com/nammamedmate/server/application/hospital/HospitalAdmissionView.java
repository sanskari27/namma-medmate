package com.nammamedmate.server.application.hospital;

import com.nammamedmate.server.domain.HospitalAdmissionStatus;
import com.nammamedmate.server.domain.HospitalPayerType;
import java.time.Instant;
import java.util.UUID;

public record HospitalAdmissionView(
    UUID id,
    String uhid,
    String patientName,
    String phone,
    Integer age,
    String gender,
    UUID customerId,
    UUID wardId,
    String wardName,
    UUID bedId,
    String bedLabel,
    UUID attendingDoctorId,
    String attendingDoctorName,
    String diagnosis,
    HospitalPayerType payerType,
    String insurerName,
    String policyNumber,
    HospitalAdmissionStatus status,
    Instant admittedAt,
    long version) {}
