package com.nammamedmate.server.application.hospital;

import java.util.List;

public record HospitalWardOccupancyView(
    int wardCount,
    int totalBeds,
    int occupiedBeds,
    int freeBeds,
    int occupancyPercent,
    int admittedCount,
    List<HospitalWardView> wards) {}
