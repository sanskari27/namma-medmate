package com.nammamedmate.server.application.hospital;

import java.util.UUID;

public record HospitalPriceRuleCommand(UUID productId, String ruleType, Integer value) {}
