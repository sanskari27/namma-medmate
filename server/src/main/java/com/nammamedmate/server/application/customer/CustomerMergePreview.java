package com.nammamedmate.server.application.customer;

import java.util.List;

public record CustomerMergePreview(
    String mode,
    CustomerView survivor,
    CustomerView duplicate,
    List<CustomerMergeFieldView> fields,
    List<String> conflicts,
    CustomerMergeLinkedRecords linkedRecords) {

  public record CustomerMergeFieldView(
      String field, String status, String survivorValue, String duplicateValue) {}

  public record CustomerMergeLinkedRecords(long notificationEvents) {}
}
