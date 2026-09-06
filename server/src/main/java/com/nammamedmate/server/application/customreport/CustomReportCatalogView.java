package com.nammamedmate.server.application.customreport;

import java.util.List;

public record CustomReportCatalogView(List<DatasetItem> datasets, List<OperatorItem> operators) {

  public record DatasetItem(String key, String label, List<FieldItem> fields) {}

  public record FieldItem(String key, String label, String kind) {}

  public record OperatorItem(String key, String label) {}
}
