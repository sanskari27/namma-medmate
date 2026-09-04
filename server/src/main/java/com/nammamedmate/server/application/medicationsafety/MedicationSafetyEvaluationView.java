package com.nammamedmate.server.application.medicationsafety;

import java.util.List;

public record MedicationSafetyEvaluationView(
    String checkStatus,
    String checkLabel,
    int productsChecked,
    List<MedicationSafetyWarningView> warnings) {}
