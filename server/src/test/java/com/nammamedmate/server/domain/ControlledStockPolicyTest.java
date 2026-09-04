package com.nammamedmate.server.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.nammamedmate.server.shared.exception.ApiException;
import org.junit.jupiter.api.Test;

class ControlledStockPolicyTest {

  @Test
  void scheduleHFamilyAndFlagAreControlled() {
    assertThat(ControlledStockPolicy.isControlled(ScheduleClassification.H, false)).isTrue();
    assertThat(ControlledStockPolicy.isControlled(ScheduleClassification.H1, false)).isTrue();
    assertThat(ControlledStockPolicy.isControlled(ScheduleClassification.X, false)).isTrue();
    assertThat(ControlledStockPolicy.isControlled(ScheduleClassification.NDPS, false)).isTrue();
    assertThat(ControlledStockPolicy.isControlled(null, true)).isTrue();
    assertThat(ControlledStockPolicy.isControlled(ScheduleClassification.OTC, false)).isFalse();
    assertThat(ControlledStockPolicy.isControlled(null, false)).isFalse();
  }

  @Test
  void ownerAndPharmacistMayDispense() {
    ControlledStockPolicy.requireDispenseAuthority(AppUserRole.pharmacy_owner, false);
    ControlledStockPolicy.requireDispenseAuthority(AppUserRole.pharmacy_staff, true);
  }

  @Test
  void cashierOnlyCannotDispense() {
    assertThatThrownBy(
            () -> ControlledStockPolicy.requireDispenseAuthority(AppUserRole.pharmacy_staff, false))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo("PHARMACIST_REQUIRED");
  }

  @Test
  void incompletePatientPrescriberOrUnverifiedFails() {
    assertThatThrownBy(() -> ControlledStockPolicy.requirePrescriptionVerified(null, uuid(), true))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo("INCOMPLETE_CONTROLLED");
    assertThatThrownBy(() -> ControlledStockPolicy.requirePrescriptionVerified(uuid(), null, true))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo("INCOMPLETE_CONTROLLED");
    assertThatThrownBy(
            () -> ControlledStockPolicy.requirePrescriptionVerified(uuid(), uuid(), false))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo("INCOMPLETE_CONTROLLED");
  }

  private static java.util.UUID uuid() {
    return java.util.UUID.fromString("00000000-0000-0000-0000-000000000001");
  }
}
