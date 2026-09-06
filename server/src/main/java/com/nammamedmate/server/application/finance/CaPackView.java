package com.nammamedmate.server.application.finance;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record CaPackView(
    LocalDate from,
    LocalDate to,
    String scope,
    UUID branchId,
    Instant generatedAt,
    List<CaPackSection> sections) {}
