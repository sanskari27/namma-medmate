package com.nammamedmate.server.application.doctor;

import java.util.UUID;

public record TopReferringDoctorView(
    UUID id, String name, String registrationNumber, long referralCount) {}
