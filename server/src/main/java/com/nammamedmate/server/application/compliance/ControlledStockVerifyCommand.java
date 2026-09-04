package com.nammamedmate.server.application.compliance;

import java.util.List;
import java.util.UUID;

public record ControlledStockVerifyCommand(
    UUID customerId,
    UUID doctorId,
    boolean prescriptionVerified,
    String prescriptionReference,
    List<UUID> productIds) {}
