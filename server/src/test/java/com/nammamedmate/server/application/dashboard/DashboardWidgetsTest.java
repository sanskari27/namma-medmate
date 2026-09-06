package com.nammamedmate.server.application.dashboard;

import static org.assertj.core.api.Assertions.assertThat;

import com.nammamedmate.server.domain.DashboardPolicy;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class DashboardWidgetsTest {

  private static final Instant AS_OF = Instant.parse("2026-09-06T06:00:00Z");

  @Test
  void ac04_failedSourceIsLabeledUnavailableWithoutData() {
    DashboardWidget<String> ok =
        DashboardWidgets.load(
            DashboardPolicy.WIDGET_SALES, AS_OF, DashboardPolicy.SALES_HREF, () -> "ok");
    DashboardWidget<String> failed =
        DashboardWidgets.load(
            DashboardPolicy.WIDGET_LOW_STOCK,
            AS_OF,
            DashboardPolicy.STOCK_HREF,
            () -> {
              throw new IllegalStateException("stock down");
            });
    DashboardWidget<String> gated =
        DashboardWidgets.planLimited(
            DashboardPolicy.WIDGET_RECEIVABLES,
            AS_OF,
            DashboardPolicy.SUBSCRIPTION_HREF,
            "Khata and stockist aging is on Growth. Open the plan to turn it on.");
    assertThat(ok.status()).isEqualTo(DashboardPolicy.OK);
    assertThat(ok.data()).isEqualTo("ok");
    assertThat(ok.error()).isNull();
    assertThat(failed.status()).isEqualTo(DashboardPolicy.FAILED);
    assertThat(failed.data()).isNull();
    assertThat(failed.error()).isEqualTo(DashboardPolicy.UNAVAILABLE);
    assertThat(failed.asOf()).isEqualTo(AS_OF);
    assertThat(gated.status()).isEqualTo(DashboardPolicy.PLAN_LIMIT);
    assertThat(gated.data()).isNull();
    assertThat(gated.error()).contains("Growth");
    assertThat(gated.href()).isEqualTo(DashboardPolicy.SUBSCRIPTION_HREF);
  }
}
