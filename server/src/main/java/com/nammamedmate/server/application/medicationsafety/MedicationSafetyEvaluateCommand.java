package com.nammamedmate.server.application.medicationsafety;

import java.util.List;
import java.util.UUID;

public record MedicationSafetyEvaluateCommand(UUID customerId, List<UUID> productIds) {}
