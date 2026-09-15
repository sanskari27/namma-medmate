package com.nammamedmate.server;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.nammamedmate.server.infrastructure.ProdEmailUrlGuard;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class ProdEmailUrlGuardTest {

  @Test
  void rejectsLocalhostInProd_OPS_EMAIL_URL() {
    ProdEmailUrlGuard guard =
        guardWith(
            "http://localhost:5173/reset-password",
            "https://admin.nammamedmate.com/reset-password",
            "https://pharmacy.nammamedmate.com/verify-email");

    assertThatThrownBy(guard::failIfLocalhost)
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("localhost");
  }

  @Test
  void rejectsHttpPublicHostInProd_OPS_EMAIL_URL() {
    ProdEmailUrlGuard guard =
        guardWith(
            "http://pharmacy.nammamedmate.com/reset-password",
            "https://admin.nammamedmate.com/reset-password",
            "https://pharmacy.nammamedmate.com/verify-email");

    assertThatThrownBy(guard::failIfLocalhost)
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("https");
  }

  @Test
  void acceptsPharmacyHttps_OPS_EMAIL_URL() {
    ProdEmailUrlGuard guard =
        guardWith(
            "https://pharmacy.nammamedmate.com/reset-password",
            "https://admin.nammamedmate.com/reset-password",
            "https://pharmacy.nammamedmate.com/verify-email");

    assertThatCode(guard::failIfLocalhost).doesNotThrowAnyException();
  }

  private static ProdEmailUrlGuard guardWith(
      String dispensaryReset, String adminReset, String verifyEmail) {
    ProdEmailUrlGuard guard = new ProdEmailUrlGuard();
    ReflectionTestUtils.setField(guard, "dispensaryResetUrl", dispensaryReset);
    ReflectionTestUtils.setField(guard, "adminResetUrl", adminReset);
    ReflectionTestUtils.setField(guard, "verifyEmailUrl", verifyEmail);
    return guard;
  }
}
