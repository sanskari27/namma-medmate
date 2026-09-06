package com.nammamedmate.server.application.dashboard;

import com.nammamedmate.server.domain.DashboardPolicy;
import java.time.Instant;
import java.util.function.Supplier;

public final class DashboardWidgets {

  private DashboardWidgets() {}

  public static <T> DashboardWidget<T> ok(String key, Instant asOf, String href, T data) {
    return new DashboardWidget<>(key, DashboardPolicy.OK, asOf, href, null, data);
  }

  public static <T> DashboardWidget<T> failed(String key, Instant asOf, String href) {
    return new DashboardWidget<>(
        key, DashboardPolicy.FAILED, asOf, href, DashboardPolicy.UNAVAILABLE, null);
  }

  public static <T> DashboardWidget<T> load(
      String key, Instant asOf, String href, Supplier<T> source) {
    try {
      return ok(key, asOf, href, source.get());
    } catch (RuntimeException ex) {
      return failed(key, asOf, href);
    }
  }
}
