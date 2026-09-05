package com.nammamedmate.server.application.compliance;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public record ComplianceReportTableView(
    String key,
    String title,
    List<String> columns,
    List<Map<String, String>> items,
    Instant generatedAt) {}
