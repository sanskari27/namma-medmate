package com.nammamedmate.server.domain;

import java.util.List;

public enum FinanceReportKey {
  DAY_BOOK("Day Book", List.of("from", "to")),
  SALES_SUMMARY("Sales Summary", List.of("from", "to")),
  PURCHASE_SUMMARY("Purchase Summary", List.of("from", "to")),
  EXPENSE_SUMMARY("Expense Summary", List.of("from", "to")),
  PROFIT_AND_LOSS("Profit & Loss", List.of("from", "to")),
  GSTR1("GSTR-1 style sales", List.of("from", "to")),
  GSTR3B("GSTR-3B style summary", List.of("from", "to")),
  BRANCH_PNL("Branch-wise P&L", List.of("from", "to"));

  private final String title;
  private final List<String> filters;

  FinanceReportKey(String title, List<String> filters) {
    this.title = title;
    this.filters = filters;
  }

  public String title() {
    return title;
  }

  public List<String> filters() {
    return filters;
  }
}
