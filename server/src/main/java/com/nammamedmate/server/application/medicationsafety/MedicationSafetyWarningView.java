package com.nammamedmate.server.application.medicationsafety;

import java.util.List;
import java.util.UUID;

public record MedicationSafetyWarningView(
    String warningKey,
    String kind,
    UUID customerId,
    UUID productId,
    List<UUID> productIds,
    String matchedAllergen,
    String matchedComposition,
    String matchedField,
    String severity,
    String requiredAction,
    boolean requiredReview) {}
