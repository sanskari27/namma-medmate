package com.nammamedmate.server.application.hospital;

import java.util.List;

public record HospitalPriceListCommand(
    Integer uniformDiscountBps,
    List<HospitalPriceRuleCommand> productRules,
    Long expectedVersion) {}
