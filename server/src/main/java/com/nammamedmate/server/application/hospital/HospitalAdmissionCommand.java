package com.nammamedmate.server.application.hospital;

import java.util.UUID;

public record HospitalAdmissionCommand(
    String patientName,
    String uhid,
    UUID wardId,
    UUID bedId,
    String phone,
    Integer age,
    String gender,
    UUID attendingDoctorId,
    String diagnosis,
    String payerType,
    String insurerName,
    String policyNumber) {}
