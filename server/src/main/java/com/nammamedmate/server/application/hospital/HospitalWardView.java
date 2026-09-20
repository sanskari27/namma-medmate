package com.nammamedmate.server.application.hospital;

import com.nammamedmate.server.domain.HospitalWardCategory;
import java.util.List;
import java.util.UUID;

public record HospitalWardView(
    UUID id,
    String name,
    String code,
    String floor,
    HospitalWardCategory category,
    int capacity,
    String nurseInCharge,
    long version,
    List<HospitalBedView> beds) {}
