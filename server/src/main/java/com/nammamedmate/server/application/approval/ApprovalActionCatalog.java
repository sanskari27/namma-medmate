package com.nammamedmate.server.application.approval;

import com.nammamedmate.server.domain.ApprovalActionKey;
import com.nammamedmate.server.domain.ApprovalThresholdUnit;
import com.nammamedmate.server.domain.ModuleCode;
import java.util.Arrays;
import java.util.List;

public final class ApprovalActionCatalog {

  private ApprovalActionCatalog() {}

  public static List<ApprovalActionCatalogItem> all() {
    return Arrays.stream(ApprovalActionKey.values())
        .map(
            key ->
                new ApprovalActionCatalogItem(
                    key.name(), key.module().name(), key.unit().name(), label(key), key.unit()))
        .toList();
  }

  public static ApprovalActionKey require(String actionKey) {
    try {
      return ApprovalActionKey.valueOf(actionKey);
    } catch (RuntimeException ex) {
      throw new com.nammamedmate.server.shared.exception.ApiException(
          org.springframework.http.HttpStatus.BAD_REQUEST,
          "VALIDATION_ERROR",
          "Unknown approval action");
    }
  }

  public static void requireModuleMatch(ApprovalActionKey key, ModuleCode module) {
    if (key.module() != module) {
      throw new com.nammamedmate.server.shared.exception.ApiException(
          org.springframework.http.HttpStatus.UNPROCESSABLE_ENTITY,
          "MODULE_MISMATCH",
          "Action does not belong to that module");
    }
  }

  private static String label(ApprovalActionKey key) {
    return switch (key) {
      case SALES_DISCOUNT_PERCENT -> "Sales discount percent";
      case INVENTORY_WRITE_OFF -> "Inventory write-off";
    };
  }

  public record ApprovalActionCatalogItem(
      String actionKey,
      String moduleCode,
      String unit,
      String label,
      ApprovalThresholdUnit thresholdUnit) {}
}
