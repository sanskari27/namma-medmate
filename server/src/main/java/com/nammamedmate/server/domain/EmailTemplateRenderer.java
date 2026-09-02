package com.nammamedmate.server.domain;

import java.util.Map;

public final class EmailTemplateRenderer {

  static final String DEFAULT_BRAND = "Namma MedMate";

  private EmailTemplateRenderer() {}

  public static RenderedEmail render(
      EmailTemplate template, String pharmacyName, Map<String, String> variables) {
    String brand =
        pharmacyName == null || pharmacyName.isBlank() ? DEFAULT_BRAND : pharmacyName.trim();
    return switch (template) {
      case PASSWORD_RESET ->
          new RenderedEmail(
              "Reset your Namma MedMate password",
              "<p>Reset your password: " + variables.get("resetUrl") + "</p>");
      case ONBOARDING ->
          new RenderedEmail(
              "Verify your Namma MedMate email",
              "<p>Verify your email: " + variables.get("verifyUrl") + "</p>");
      case INVOICE_COPY ->
          new RenderedEmail(
              "Your invoice from " + brand,
              "<p>Invoice " + variables.get("invoiceNumber") + "</p>");
    };
  }
}
