package com.nammamedmate.server.application.hospital;

import com.nammamedmate.server.domain.HospitalDoctorStatus;
import java.util.UUID;

public record HospitalDoctorView(
    UUID id,
    UUID doctorId,
    String name,
    String registrationNumber,
    String phone,
    UUID departmentId,
    String departmentName,
    String qualification,
    String specialty,
    String gender,
    Integer experienceYears,
    String email,
    String opdRoom,
    String consultingDays,
    String consultingHours,
    long consultationFeePaise,
    HospitalDoctorStatus status,
    String languages,
    String notes,
    long version) {}
