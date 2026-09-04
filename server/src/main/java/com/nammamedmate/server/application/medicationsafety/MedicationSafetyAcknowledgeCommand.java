package com.nammamedmate.server.application.medicationsafety;

import java.util.List;
import java.util.UUID;

public record MedicationSafetyAcknowledgeCommand(
    UUID customerId, List<UUID> productIds, List<String> warningKeys, String reason) {}
