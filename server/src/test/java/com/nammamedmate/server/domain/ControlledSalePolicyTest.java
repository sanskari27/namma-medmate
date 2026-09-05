package com.nammamedmate.server.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.nammamedmate.server.shared.exception.ApiException;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class ControlledSalePolicyTest {

  @Test
  void ownerAndPharmacistMayViewRegister() {
    ControlledSalePolicy.requireViewer(AppUserRole.pharmacy_owner, false);
    ControlledSalePolicy.requireViewer(AppUserRole.pharmacy_staff, true);
    assertThat(ControlledSalePolicy.canView(AppUserRole.pharmacy_owner, false)).isTrue();
    assertThat(ControlledSalePolicy.canView(AppUserRole.pharmacy_staff, true)).isTrue();
  }

  @Test
  void cashierCannotViewOrExport() {
    assertThat(ControlledSalePolicy.canView(AppUserRole.pharmacy_staff, false)).isFalse();
    assertThatThrownBy(() -> ControlledSalePolicy.requireViewer(AppUserRole.pharmacy_staff, false))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(ControlledSalePolicy.FORBIDDEN);
  }

  @Test
  void saleFactNeedsProductBatchQtyRxPatientPharmacistAndTime() {
    ControlledSalePolicy.requireSaleFact(
        "Alprazolam",
        new BigDecimal("1"),
        "LOT-1",
        "RX-1",
        "Ravi",
        "Priya",
        Instant.parse("2026-09-05T10:00:00Z"));
    assertThatThrownBy(
            () ->
                ControlledSalePolicy.requireSaleFact(
                    " ",
                    new BigDecimal("1"),
                    "LOT-1",
                    "RX-1",
                    "Ravi",
                    "Priya",
                    Instant.parse("2026-09-05T10:00:00Z")))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(ControlledSalePolicy.INCOMPLETE_REGISTER);
    assertThatThrownBy(
            () ->
                ControlledSalePolicy.requireSaleFact(
                    "Alprazolam",
                    BigDecimal.ZERO,
                    "LOT-1",
                    "RX-1",
                    "Ravi",
                    "Priya",
                    Instant.parse("2026-09-05T10:00:00Z")))
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(ControlledSalePolicy.INCOMPLETE_REGISTER);
    assertThatThrownBy(
            () ->
                ControlledSalePolicy.requireSaleFact(
                    "Alprazolam",
                    new BigDecimal("1"),
                    " ",
                    "RX-1",
                    "Ravi",
                    "Priya",
                    Instant.parse("2026-09-05T10:00:00Z")))
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(ControlledSalePolicy.INCOMPLETE_REGISTER);
    assertThatThrownBy(
            () ->
                ControlledSalePolicy.requireSaleFact(
                    "Alprazolam",
                    new BigDecimal("1"),
                    "LOT-1",
                    null,
                    "Ravi",
                    "Priya",
                    Instant.parse("2026-09-05T10:00:00Z")))
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(ControlledSalePolicy.INCOMPLETE_REGISTER);
    assertThatThrownBy(
            () ->
                ControlledSalePolicy.requireSaleFact(
                    "Alprazolam",
                    new BigDecimal("1"),
                    "LOT-1",
                    "RX-1",
                    null,
                    "Priya",
                    Instant.parse("2026-09-05T10:00:00Z")))
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(ControlledSalePolicy.INCOMPLETE_REGISTER);
    assertThatThrownBy(
            () ->
                ControlledSalePolicy.requireSaleFact(
                    "Alprazolam",
                    new BigDecimal("1"),
                    "LOT-1",
                    "RX-1",
                    "Ravi",
                    "  ",
                    Instant.parse("2026-09-05T10:00:00Z")))
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(ControlledSalePolicy.INCOMPLETE_REGISTER);
    assertThatThrownBy(
            () ->
                ControlledSalePolicy.requireSaleFact(
                    "Alprazolam", new BigDecimal("1"), "LOT-1", "RX-1", "Ravi", "Priya", null))
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(ControlledSalePolicy.INCOMPLETE_REGISTER);
  }

  @Test
  void returnFactNeedsLinkedSourceAndPositiveQty() {
    UUID sourceId = UUID.fromString("00000000-0000-0000-0000-000000000009");
    ControlledSalePolicy.requireReturnFact(
        sourceId, new BigDecimal("1"), Instant.parse("2026-09-05T11:00:00Z"));
    assertThatThrownBy(
            () ->
                ControlledSalePolicy.requireReturnFact(
                    null, new BigDecimal("1"), Instant.parse("2026-09-05T11:00:00Z")))
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(ControlledSalePolicy.INCOMPLETE_REGISTER);
    assertThatThrownBy(
            () ->
                ControlledSalePolicy.requireReturnFact(
                    sourceId, new BigDecimal("-1"), Instant.parse("2026-09-05T11:00:00Z")))
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(ControlledSalePolicy.INCOMPLETE_REGISTER);
  }

  @Test
  void parseScheduleRejectsUnknownValues() {
    assertThat(ControlledSalePolicy.parseSchedule("h1")).isEqualTo(ScheduleClassification.H1);
    assertThat(ControlledSalePolicy.parseSchedule(null)).isNull();
    assertThatThrownBy(() -> ControlledSalePolicy.parseSchedule("COLD"))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getStatus().value())
        .isEqualTo(400);
  }
}
