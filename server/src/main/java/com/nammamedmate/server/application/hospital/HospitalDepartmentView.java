package com.nammamedmate.server.application.hospital;

import com.nammamedmate.server.domain.HospitalDepartmentType;
import java.util.UUID;

public record HospitalDepartmentView(
    UUID id,
    String name,
    HospitalDepartmentType type,
    UUID headDoctorId,
    String headDoctorName,
    long version) {}
