package com.nammamedmate.server.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.nammamedmate.server.shared.exception.ApiException;
import org.junit.jupiter.api.Test;

class FinanceAccessPolicyTest {

  @Test
  void ac01_ownerWithFinanceIsAllowed() {
    assertThat(FinanceAccessPolicy.allows(AppUserRole.pharmacy_owner, false, true)).isTrue();
    FinanceAccessPolicy.requireAllowed(AppUserRole.pharmacy_owner, false, true);
  }

  @Test
  void ac01_accountantDeskWithFinanceIsAllowed() {
    assertThat(FinanceAccessPolicy.allows(AppUserRole.pharmacy_staff, true, true)).isTrue();
    FinanceAccessPolicy.requireAllowed(AppUserRole.pharmacy_staff, true, true);
  }

  @Test
  void ac01_cashierPharmacistAndCustomFinanceWithoutAccountantAreDenied() {
    assertThat(FinanceAccessPolicy.allows(AppUserRole.pharmacy_staff, false, false)).isFalse();
    assertThat(FinanceAccessPolicy.allows(AppUserRole.pharmacy_staff, false, true)).isFalse();
    assertThat(FinanceAccessPolicy.allows(AppUserRole.pharmacy_staff, true, false)).isFalse();
    assertThat(FinanceAccessPolicy.allows(AppUserRole.admin_super, true, true)).isFalse();
    assertThatThrownBy(
            () -> FinanceAccessPolicy.requireAllowed(AppUserRole.pharmacy_staff, false, true))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(FinanceAccessPolicy.FORBIDDEN);
  }

  @Test
  void ac03_caPackExportIsPdfOnly() {
    assertThat(FinanceAccessPolicy.requirePdf(null)).isEqualTo("pdf");
    assertThat(FinanceAccessPolicy.requirePdf("PDF")).isEqualTo("pdf");
    assertThatThrownBy(() -> FinanceAccessPolicy.requirePdf("csv"))
        .extracting(ex -> ((ApiException) ex).getStatus().value())
        .isEqualTo(400);
    assertThatThrownBy(() -> FinanceAccessPolicy.requirePdf("tally"))
        .extracting(ex -> ((ApiException) ex).getStatus().value())
        .isEqualTo(400);
  }
}
