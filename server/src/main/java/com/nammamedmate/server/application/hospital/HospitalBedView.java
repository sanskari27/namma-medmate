package com.nammamedmate.server.application.hospital;

import java.util.UUID;

public record HospitalBedView(
    UUID id, int sequenceNo, String label, String occupancyStatus, long version) {}
