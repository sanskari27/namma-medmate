package com.nammamedmate.server.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.nammamedmate.server.shared.exception.ApiException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class HospitalPolicyTest {

  @Test
  void ac01_proOnlyEntitlement() {
    assertThat(HospitalPolicy.entitled(PlanCode.PRO)).isTrue();
    assertThat(HospitalPolicy.entitled(PlanCode.GROWTH)).isFalse();
    assertThatThrownBy(() -> HospitalPolicy.assertEntitled(PlanCode.FREE))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(HospitalPolicy.PLAN_LIMIT);
  }

  @Test
  void ac03_uniformPercentAppliesWhenNoProductRule() {
    assertThat(HospitalPolicy.creditPricePaise(10_000L, 500, null, null)).isEqualTo(9_500L);
  }

  @Test
  void ac03_productPercentOverride() {
    assertThat(HospitalPolicy.creditPricePaise(10_000L, 500, HospitalPriceRuleType.PERCENT, 1_000))
        .isEqualTo(9_000L);
  }

  @Test
  void ac03_productFlatOverride() {
    assertThat(
            HospitalPolicy.creditPricePaise(10_000L, 500, HospitalPriceRuleType.FLAT_PAISE, 1_500))
        .isEqualTo(8_500L);
  }

  @Test
  void ac05_zeroCapacityRejected() {
    assertThatThrownBy(() -> HospitalPolicy.requirePositiveCapacity(0))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getStatus())
        .isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
  }

  @Test
  void ac04_bedOccupiedCode() {
    assertThat(HospitalPolicy.bedOccupied().getCode()).isEqualTo(HospitalPolicy.BED_OCCUPIED);
    assertThat(HospitalPolicy.bedOccupied().getStatus()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
  }

  @Test
  void ac01_departmentTypeParser() {
    assertThat(HospitalPolicy.parseDepartmentType("opd")).isEqualTo(HospitalDepartmentType.OPD);
    assertThat(HospitalPolicy.parseDepartmentType("DIAGNOSTIC"))
        .isEqualTo(HospitalDepartmentType.DIAGNOSTIC);
    assertThatThrownBy(() -> HospitalPolicy.parseDepartmentType("invalid"))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getStatus())
        .isEqualTo(HttpStatus.BAD_REQUEST);
  }

  @Test
  void ac02_doctorStatusParser() {
    assertThat(HospitalPolicy.parseDoctorStatus("available"))
        .isEqualTo(HospitalDoctorStatus.AVAILABLE);
    assertThat(HospitalPolicy.parseDoctorStatus("ON_LEAVE"))
        .isEqualTo(HospitalDoctorStatus.ON_LEAVE);
    assertThatThrownBy(() -> HospitalPolicy.parseDoctorStatus(""))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getStatus())
        .isEqualTo(HttpStatus.BAD_REQUEST);
  }

  @Test
  void ac05_discountOverMrpRejected() {
    assertThatThrownBy(
            () -> HospitalPolicy.creditPricePaise(1_000L, 0, HospitalPriceRuleType.PERCENT, 15_000))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getStatus())
        .isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
  }
}
