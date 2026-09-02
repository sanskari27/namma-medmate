package com.nammamedmate.server.domain;

import java.util.Set;

public enum EmailTemplate {
  PASSWORD_RESET("resetUrl"),
  ONBOARDING("verifyUrl"),
  INVOICE_COPY("invoiceNumber");

  private final String variableKey;

  EmailTemplate(String variableKey) {
    this.variableKey = variableKey;
  }

  public Set<String> variableKeys() {
    return Set.of(variableKey);
  }
}
