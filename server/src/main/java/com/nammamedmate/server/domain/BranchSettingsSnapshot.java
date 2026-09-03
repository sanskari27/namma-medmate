package com.nammamedmate.server.domain;

import java.util.LinkedHashMap;
import java.util.Map;

public final class BranchSettingsSnapshot {

  private BranchSettingsSnapshot() {}

  public static Map<String, Object> copy(Map<String, Object> source) {
    if (source == null || source.isEmpty()) {
      return new LinkedHashMap<>();
    }
    return deepCopy(source);
  }

  @SuppressWarnings("unchecked")
  private static Map<String, Object> deepCopy(Map<String, Object> source) {
    Map<String, Object> copy = new LinkedHashMap<>();
    for (Map.Entry<String, Object> entry : source.entrySet()) {
      Object value = entry.getValue();
      if (value instanceof Map<?, ?> nested) {
        copy.put(entry.getKey(), deepCopy((Map<String, Object>) nested));
      } else {
        copy.put(entry.getKey(), value);
      }
    }
    return copy;
  }
}
