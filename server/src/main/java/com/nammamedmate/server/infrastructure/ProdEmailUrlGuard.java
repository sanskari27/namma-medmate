package com.nammamedmate.server.infrastructure;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("prod")
public class ProdEmailUrlGuard {

  @Value("${app.password-reset.dispensary-url}")
  private String dispensaryResetUrl;

  @Value("${app.password-reset.admin-url}")
  private String adminResetUrl;

  @Value("${app.email-verification.dispensary-url}")
  private String verifyEmailUrl;

  @PostConstruct
  public void failIfLocalhost() {
    requirePublicHttps("app.password-reset.dispensary-url", dispensaryResetUrl);
    requirePublicHttps("app.password-reset.admin-url", adminResetUrl);
    requirePublicHttps("app.email-verification.dispensary-url", verifyEmailUrl);
  }

  private static void requirePublicHttps(String name, String url) {
    if (url == null
        || url.isBlank()
        || !url.startsWith("https://")
        || url.contains("localhost")
        || url.contains("127.0.0.1")) {
      throw new IllegalStateException(
          name + " must be an https public URL in prod, not localhost: " + url);
    }
  }
}
