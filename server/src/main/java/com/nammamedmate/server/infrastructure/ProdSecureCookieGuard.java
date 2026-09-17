package com.nammamedmate.server.infrastructure;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("prod")
public class ProdSecureCookieGuard {

  @Value("${app.security.secure-cookie:false}")
  private boolean secureCookie;

  @PostConstruct
  public void failIfInsecure() {
    if (!secureCookie) {
      throw new IllegalStateException(
          "app.security.secure-cookie must be true in prod so nmm_access is Secure");
    }
  }
}
