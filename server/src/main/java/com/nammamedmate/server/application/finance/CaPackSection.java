package com.nammamedmate.server.application.finance;

import java.util.List;
import java.util.Map;

public record CaPackSection(
    String key,
    String title,
    List<FinanceReportTotal> totals,
    List<String> columns,
    List<Map<String, String>> items) {}
