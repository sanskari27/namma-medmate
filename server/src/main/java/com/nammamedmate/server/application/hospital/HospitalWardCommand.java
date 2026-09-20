package com.nammamedmate.server.application.hospital;

public record HospitalWardCommand(
    String name,
    String code,
    String floor,
    String category,
    Integer capacity,
    String nurseInCharge,
    Long expectedVersion) {}
