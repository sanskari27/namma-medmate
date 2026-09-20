package com.nammamedmate.server.application.hospital;

import java.util.UUID;

public record HospitalDepartmentCommand(
    String name, String type, UUID headDoctorId, Long expectedVersion) {}
