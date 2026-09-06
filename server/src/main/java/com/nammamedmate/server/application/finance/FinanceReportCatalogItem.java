package com.nammamedmate.server.application.finance;

import java.util.List;

public record FinanceReportCatalogItem(String key, String title, List<String> filters) {}
