package com.nammamedmate.server.application.customreport;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record CustomReportPreviewView(
    String dataset,
    LocalDate from,
    LocalDate to,
    String scope,
    UUID branchId,
    List<String> columns,
    List<Map<String, String>> items,
    int rowCount,
    boolean truncated,
    Instant generatedAt) {}
