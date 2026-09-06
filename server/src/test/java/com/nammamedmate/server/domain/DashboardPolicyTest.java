package com.nammamedmate.server.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.nammamedmate.server.shared.exception.ApiException;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;

class DashboardPolicyTest {

  @Test
  void ac05_ownerPermittedRolesAreUniqueAndIncludeEveryDesk() {
    List<DashboardRole> roles =
        DashboardPolicy.permitted(AppUserRole.pharmacy_owner, Set.of(), false);
    assertThat(roles)
        .containsExactly(
            DashboardRole.OWNER,
            DashboardRole.CASHIER,
            DashboardRole.INVENTORY,
            DashboardRole.ACCOUNTANT);
    assertThat(roles).doesNotHaveDuplicates();
  }

  @Test
  void ac05_unionOfModulesDoesNotDuplicateDesks() {
    List<DashboardRole> roles =
        DashboardPolicy.permitted(
            AppUserRole.pharmacy_staff, Set.of(ModuleCode.SALES, ModuleCode.INVENTORY), false);
    assertThat(roles).containsExactly(DashboardRole.CASHIER, DashboardRole.INVENTORY);
    assertThat(roles).doesNotHaveDuplicates();
  }

  @Test
  void ac01_cashierSalesModuleOpensTillDeskOnly() {
    List<DashboardRole> roles =
        DashboardPolicy.permitted(AppUserRole.pharmacy_staff, Set.of(ModuleCode.SALES), false);
    assertThat(roles).containsExactly(DashboardRole.CASHIER);
    DashboardPolicy.requireOpen(
        DashboardRole.CASHIER, AppUserRole.pharmacy_staff, Set.of(ModuleCode.SALES), false);
    assertThatThrownBy(
            () ->
                DashboardPolicy.requireOpen(
                    DashboardRole.INVENTORY,
                    AppUserRole.pharmacy_staff,
                    Set.of(ModuleCode.SALES),
                    false))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(DashboardPolicy.FORBIDDEN);
  }

  @Test
  void ac02_inventoryModuleOpensStockDesk() {
    assertThat(
            DashboardPolicy.permitted(
                AppUserRole.pharmacy_staff, Set.of(ModuleCode.INVENTORY), false))
        .containsExactly(DashboardRole.INVENTORY);
  }

  @Test
  void ac03_accountantDeskRequiresFinanceAndAccountantCode() {
    assertThat(
            DashboardPolicy.permitted(AppUserRole.pharmacy_staff, Set.of(ModuleCode.FINANCE), true))
        .containsExactly(DashboardRole.ACCOUNTANT);
    assertThat(
            DashboardPolicy.permitted(
                AppUserRole.pharmacy_staff, Set.of(ModuleCode.FINANCE), false))
        .isEmpty();
  }

  @Test
  void ac06_pharmacistCannotOpenBooksOrOwnerDesk() {
    Set<ModuleCode> pharmacist = Set.of(ModuleCode.SALES, ModuleCode.INVENTORY, ModuleCode.CRM);
    assertThat(DashboardPolicy.permitted(AppUserRole.pharmacy_staff, pharmacist, false))
        .containsExactly(DashboardRole.CASHIER, DashboardRole.INVENTORY);
    assertThatThrownBy(
            () ->
                DashboardPolicy.requireOpen(
                    DashboardRole.ACCOUNTANT, AppUserRole.pharmacy_staff, pharmacist, false))
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(DashboardPolicy.FORBIDDEN);
    assertThatThrownBy(
            () ->
                DashboardPolicy.requireOpen(
                    DashboardRole.OWNER, AppUserRole.pharmacy_staff, pharmacist, false))
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(DashboardPolicy.FORBIDDEN);
  }

  @Test
  void ac06_invalidRoleAndTenantScopeOnStaffAreRejected() {
    assertThatThrownBy(() -> DashboardPolicy.requireRole("pharmacist"))
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(DashboardPolicy.VALIDATION_ERROR);
    assertThatThrownBy(() -> DashboardPolicy.requireScope(DashboardRole.CASHIER, "tenant"))
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(DashboardPolicy.VALIDATION_ERROR);
    assertThat(DashboardPolicy.requireScope(DashboardRole.OWNER, "tenant"))
        .isEqualTo(DashboardPolicy.SCOPE_TENANT);
    assertThat(DashboardPolicy.requireRole("cashier")).isEqualTo(DashboardRole.CASHIER);
  }
}
