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
              "Reset your Namma MedMate password", passwordResetHtml(pharmacyName, variables));
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

  private static String passwordResetHtml(String pharmacyName, Map<String, String> variables) {
    boolean namedPharmacy = pharmacyName != null && !pharmacyName.isBlank();
    String hero =
        namedPharmacy
            ? "<p style=\"margin:0;font-family:Georgia,'Times New Roman',Times,serif;font-size:26px;line-height:1.25;color:#13241b;\">"
                + escape(pharmacyName.trim())
                + "</p><p style=\"margin:8px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.4;color:#0a6b47;\">Owner password</p>"
            : "<p style=\"margin:0;font-family:Georgia,'Times New Roman',Times,serif;font-size:26px;line-height:1.25;color:#13241b;\">Set a new password</p><p style=\"margin:8px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.4;color:#0a6b47;\">Namma MedMate account</p>";
    String intro =
        namedPharmacy
            ? "Someone asked to reset the owner password for this pharmacy. The link works once, and only for a short window."
            : "Someone asked to reset the password on this Namma MedMate account. The link works once, and only for a short window.";
    String resetUrl = escape(variables.get("resetUrl"));
    return """
        <!DOCTYPE html>
        <html lang="en">
        <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Reset your Namma MedMate password</title>
        </head>
        <body style="margin:0;padding:0;background-color:#e8efe9;">
        <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">
        A time-limited link to set a new Namma MedMate password.
        </div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#e8efe9" style="background-color:#e8efe9;">
          <tr>
            <td align="center" style="padding:40px 16px;">
              <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;border:2px solid #13241b;background-color:#f7faf7;">
                <tr>
                  <td width="1" bgcolor="#0a6b47" style="width:0.5px;background-color:#0a6b47;font-size:0;line-height:0;">&nbsp;</td>
                  <td>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#13241b" style="background-color:#13241b;">
                      <tr>
                        <td style="padding:22px 32px;">
                          <table role="presentation" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="padding-right:14px;vertical-align:middle;">
                                <table role="presentation" cellpadding="0" cellspacing="0" bgcolor="#f7faf7" style="border-collapse:collapse;background-color:#f7faf7;">
                                  <tr>
                                    <td style="padding:3px;">
                                      <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                                        <tr>
                                          <td width="10" height="10" bgcolor="#0a6b47" style="width:10px;height:10px;background-color:#0a6b47;font-size:0;line-height:0;">&nbsp;</td>
                                          <td width="10" height="10" bgcolor="#d7eee3" style="width:10px;height:10px;background-color:#d7eee3;font-size:0;line-height:0;">&nbsp;</td>
                                        </tr>
                                        <tr>
                                          <td width="10" height="10" bgcolor="#d7eee3" style="width:10px;height:10px;background-color:#d7eee3;font-size:0;line-height:0;">&nbsp;</td>
                                          <td width="10" height="10" bgcolor="#0a6b47" style="width:10px;height:10px;background-color:#0a6b47;font-size:0;line-height:0;">&nbsp;</td>
                                        </tr>
                                      </table>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                              <td style="vertical-align:middle;">
                                <p style="margin:0;font-family:Georgia,'Times New Roman',Times,serif;font-size:20px;line-height:1.25;color:#f7faf7;">Namma <span style="color:#d7eee3;">MedMate</span></p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#0a6b47" style="background-color:#0a6b47;">
                      <tr>
                        <td style="padding:11px 32px;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:0.08em;color:#f7faf7;">Password reset</td>
                      </tr>
                    </table>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#f7faf7" style="background-color:#f7faf7;">
                      <tr>
                        <td style="padding:32px 32px 0 32px;">
                          {{HERO}}
                          <p style="margin:14px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#3a5248;">{{INTRO}}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:24px 32px 0 32px;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td align="center" bgcolor="#0a6b47" style="background-color:#0a6b47;">
                                <a href="{{RESET_URL}}" style="display:block;padding:16px 24px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#f7faf7;text-decoration:none;">Set a new password</a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:20px 32px 32px 32px;">
                          <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.55;color:#3a5248;">After it expires, request another from the sign-in screen.</p>
                          <p style="margin:16px 0 0;padding:14px 16px;border-left:3px solid #b45309;background-color:#e8efe9;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.55;color:#13241b;">If this was not you, ignore the mail. The current password stays as it is.</p>
                          <p style="margin:20px 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.45;color:#3a5248;">Button missing? Paste this into your browser:</p>
                          <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;word-break:break-all;"><a href="{{RESET_URL}}" style="color:#0a6b47;text-decoration:underline;">{{RESET_URL}}</a></p>
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#13241b" style="background-color:#13241b;">
                      <tr>
                        <td style="padding:14px 32px;">
                          <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#d7eee3;">Do not share this link. Indian pharmacy ERP.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        </body>
        </html>
        """
        .replace("{{HERO}}", hero)
        .replace("{{INTRO}}", intro)
        .replace("{{RESET_URL}}", resetUrl);
  }

  private static String escape(String value) {
    if (value == null || value.isEmpty()) {
      return "";
    }
    return value
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("\"", "&quot;");
  }
}
