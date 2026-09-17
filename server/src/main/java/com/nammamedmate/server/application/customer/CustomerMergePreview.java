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

  public record CustomerMergeLinkedRecords(
      long notificationEvents,
      long salesInvoices,
      long creditEntries,
      long loyaltyEntries,
      long historyFacts,
      long refills,
      long tags,
      long familyMembers) {}
}
