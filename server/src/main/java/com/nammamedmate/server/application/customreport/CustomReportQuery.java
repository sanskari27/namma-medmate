package com.nammamedmate.server.application.customreport;

import java.time.LocalDate;
import java.util.List;

public record CustomReportQuery(
    String dataset,
    List<String> columns,
    List<Filter> filters,
    LocalDate from,
    LocalDate to,
    String branchId,
    String scope) {

  public record Filter(String field, String operator, String value) {}
}
