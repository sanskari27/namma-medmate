package com.nammamedmate.server.application.finance;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record FinanceReportTableView(
    String key,
    String title,
    LocalDate from,
    LocalDate to,
    String scope,
    UUID branchId,
    List<FinanceReportTotal> totals,
    List<String> columns,
    List<Map<String, String>> items,
    Instant generatedAt) {}
