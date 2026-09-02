package com.nammamedmate.server.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import org.junit.jupiter.api.Test;

class EmailTemplateRendererTest {

  @Test
  void ac01_passwordResetRendersDeterministically() {
    RenderedEmail first =
        EmailTemplateRenderer.render(
            EmailTemplate.PASSWORD_RESET,
            "Namma MedMate",
            Map.of("resetUrl", "https://app.example/reset?t=abc"));
    RenderedEmail second =
        EmailTemplateRenderer.render(
            EmailTemplate.PASSWORD_RESET,
            "Namma MedMate",
            Map.of("resetUrl", "https://app.example/reset?t=abc"));

    assertThat(first.subject()).isEqualTo("Reset your Namma MedMate password");
    assertThat(first.html()).contains("href=\"https://app.example/reset?t=abc\"");
    assertThat(first.html()).contains("https://app.example/reset?t=abc");
    assertThat(first.html()).contains("Namma");
    assertThat(first.html()).contains("MedMate");
    assertThat(first.html()).contains("Set a new password");
    assertThat(first.html()).contains("#0a6b47");
    assertThat(first.html()).contains("#13241b");
    assertThat(first).isEqualTo(second);
  }

  @Test
  void ac01_passwordResetNamesThePharmacy() {
    RenderedEmail rendered =
        EmailTemplateRenderer.render(
            EmailTemplate.PASSWORD_RESET,
            "Varshmaan Pharmacy",
            Map.of("resetUrl", "https://app.example/reset?t=abc"));

    assertThat(rendered.html()).contains("Varshmaan Pharmacy");
    assertThat(rendered.html()).contains("owner password");
  }

  @Test
  void ac01_passwordResetWithoutPharmacyStaysProductScoped() {
    RenderedEmail rendered =
        EmailTemplateRenderer.render(
            EmailTemplate.PASSWORD_RESET,
            "  ",
            Map.of("resetUrl", "https://app.example/reset?t=abc"));

    assertThat(rendered.html()).contains("this Namma MedMate account");
    assertThat(rendered.html()).doesNotContain("owner password");
  }

  @Test
  void ac01_passwordResetEscapesHtmlInPharmacyAndUrl() {
    RenderedEmail rendered =
        EmailTemplateRenderer.render(
            EmailTemplate.PASSWORD_RESET,
            "<script>x</script>",
            Map.of("resetUrl", "https://app.example/reset?t=a&b=1"));

    assertThat(rendered.html()).doesNotContain("<script>");
    assertThat(rendered.html()).contains("&lt;script&gt;x&lt;/script&gt;");
    assertThat(rendered.html()).contains("href=\"https://app.example/reset?t=a&amp;b=1\"");
  }

  @Test
  void ac01_invoiceCopyUsesPharmacyBranding() {
    RenderedEmail rendered =
        EmailTemplateRenderer.render(
            EmailTemplate.INVOICE_COPY, "Varshmaan Pharmacy", Map.of("invoiceNumber", "INV-1001"));

    assertThat(rendered.subject()).isEqualTo("Your invoice from Varshmaan Pharmacy");
    assertThat(rendered.html()).contains("INV-1001");
  }

  @Test
  void ac01_onboardingUsesDefaultBrandWhenPharmacyNameBlank() {
    RenderedEmail rendered =
        EmailTemplateRenderer.render(
            EmailTemplate.ONBOARDING,
            "  ",
            Map.of("verifyUrl", "https://app.example/verify?t=xyz"));

    assertThat(rendered.subject()).isEqualTo("Verify your Namma MedMate email");
    assertThat(rendered.html()).contains("https://app.example/verify?t=xyz");
  }
}
