package com.nammamedmate.server.application.compliance;

import java.util.List;

public record ComplianceReportCatalogItem(String key, String title, List<String> filters) {}
