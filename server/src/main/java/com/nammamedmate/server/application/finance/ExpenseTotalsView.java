package com.nammamedmate.server.application.finance;

import java.util.List;
import java.util.UUID;

public record ExpenseTotalsView(
    long totalPaise, List<CategoryTotal> byCategory, List<BranchTotal> byBranch) {

  public record CategoryTotal(UUID categoryId, String code, String label, long totalPaise) {}

  public record BranchTotal(UUID branchId, String branchName, long totalPaise) {}
}
