package com.nammamedmate.server.infrastructure.whatsapp;

public record MetaSendResult(String status, String providerMessageId, String failureCode) {

  public static MetaSendResult sent(String providerMessageId) {
    return new MetaSendResult("SENT", providerMessageId, null);
  }

  public static MetaSendResult unavailable() {
    return new MetaSendResult("FAILED", null, "PROVIDER_UNAVAILABLE");
  }

  public boolean sent() {
    return "SENT".equals(status);
  }
}
