package com.nammamedmate.server.application.hospital;

import java.util.UUID;

public record HospitalDoctorCommand(
    String name,
    String registrationNumber,
    String phone,
    UUID departmentId,
    String qualification,
    String specialty,
    String gender,
    Integer experienceYears,
    String email,
    String opdRoom,
    String consultingDays,
    String consultingHours,
    Long consultationFeePaise,
    String status,
    String languages,
    String notes,
    Long expectedVersion) {}
