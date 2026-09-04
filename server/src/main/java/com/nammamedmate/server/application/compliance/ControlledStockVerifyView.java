package com.nammamedmate.server.application.compliance;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public record ControlledStockVerifyView(
    boolean allowed, List<UUID> controlledProductIds, Map<UUID, String> schedules) {}
