package com.nammamedmate.server.application.hospital;

import com.nammamedmate.server.domain.HospitalPriceRuleType;
import java.util.UUID;

public record HospitalProductPriceView(
    UUID productId,
    String productName,
    String sku,
    long mrpPaise,
    long creditPricePaise,
    int effectiveDiscountBps,
    HospitalPriceRuleType ruleType,
    Integer ruleValue) {}
