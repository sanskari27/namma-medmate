package com.nammamedmate.server.application.medicationsafety;

import java.time.Instant;

public record MedicationSafetyAcknowledgeView(boolean acknowledged, Instant acknowledgedAt) {}
