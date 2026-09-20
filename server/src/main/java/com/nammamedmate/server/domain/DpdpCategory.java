package com.nammamedmate.server.domain;

public record DpdpCategory(
    String code,
    String purpose,
    String accessRole,
    String retentionErasure,
    String exportRule,
    String accountableOwner) {}
