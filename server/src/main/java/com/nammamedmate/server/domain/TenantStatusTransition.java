package com.nammamedmate.server.domain;

import java.util.Collections;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

public final class TenantStatusTransition {

  private static final Map<TenantStatus, Set<TenantStatus>> ALLOWED;

  static {
    Map<TenantStatus, Set<TenantStatus>> map = new EnumMap<>(TenantStatus.class);
    map.put(
        TenantStatus.ACTIVE,
        EnumSet.of(TenantStatus.SUSPENDED, TenantStatus.EXPIRED, TenantStatus.TERMINATED));
    map.put(TenantStatus.SUSPENDED, EnumSet.of(TenantStatus.ACTIVE, TenantStatus.TERMINATED));
    map.put(TenantStatus.EXPIRED, EnumSet.of(TenantStatus.ACTIVE, TenantStatus.TERMINATED));
    map.put(TenantStatus.TERMINATED, EnumSet.noneOf(TenantStatus.class));
    map.put(TenantStatus.VERIFICATION_REQUIRED, EnumSet.noneOf(TenantStatus.class));
    ALLOWED = Map.copyOf(map);
  }

  private TenantStatusTransition() {}

  public static boolean isAllowed(TenantStatus from, TenantStatus to) {
    if (from == null || to == null) {
      return false;
    }
    return ALLOWED.getOrDefault(from, Set.of()).contains(to);
  }

  public static Set<TenantStatus> allowedFrom(TenantStatus from) {
    if (from == null) {
      return Set.of();
    }
    return Collections.unmodifiableSet(ALLOWED.getOrDefault(from, Set.of()));
  }
}
