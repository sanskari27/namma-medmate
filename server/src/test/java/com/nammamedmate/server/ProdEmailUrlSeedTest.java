package com.nammamedmate.server;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Properties;
import org.junit.jupiter.api.Test;

class ProdEmailUrlSeedTest {

  @Test
  void prodPropertiesDefaultToHttpsNotLocalhost_OPS_EMAIL_URL() throws Exception {
    Properties properties = new Properties();
    try (InputStream in = getClass().getResourceAsStream("/application-prod.properties")) {
      assertThat(in).isNotNull();
      properties.load(in);
    }

    assertPublicHttpsDefault(
        properties.getProperty("app.password-reset.dispensary-url"),
        "https://pharmacy.nammamedmate.com/reset-password");
    assertPublicHttpsDefault(
        properties.getProperty("app.password-reset.admin-url"),
        "https://admin.nammamedmate.com/reset-password");
    assertPublicHttpsDefault(
        properties.getProperty("app.email-verification.dispensary-url"),
        "https://pharmacy.nammamedmate.com/verify-email");
  }

  @Test
  void ssmSeedAndProdEnvExampleIncludeEmailUrls_OPS_EMAIL_URL() throws Exception {
    Path root = repoRoot();
    String seed = Files.readString(root.resolve("infra/terraform/modules/platform/main.tf"));
    String example = Files.readString(root.resolve(".env.prod.example"));

    assertThat(seed)
        .contains("PASSWORD_RESET_DISPENSARY_URL=${var.password_reset_dispensary_url}")
        .contains("PASSWORD_RESET_ADMIN_URL=${var.password_reset_admin_url}")
        .contains("EMAIL_VERIFICATION_DISPENSARY_URL=${var.email_verification_dispensary_url}");
    assertThat(example)
        .contains("PASSWORD_RESET_DISPENSARY_URL=https://pharmacy.nammamedmate.com/reset-password")
        .contains("PASSWORD_RESET_ADMIN_URL=https://admin.nammamedmate.com/reset-password")
        .contains(
            "EMAIL_VERIFICATION_DISPENSARY_URL=https://pharmacy.nammamedmate.com/verify-email")
        .doesNotContain("PASSWORD_RESET_DISPENSARY_URL=http://localhost");
  }

  private static void assertPublicHttpsDefault(String raw, String expectedUrl) {
    assertThat(raw).isNotBlank().doesNotContain("localhost").contains(expectedUrl);
  }

  private static Path repoRoot() {
    Path cwd = Path.of("").toAbsolutePath().normalize();
    if (cwd.endsWith("server")) {
      return cwd.getParent();
    }
    return cwd;
  }
}
