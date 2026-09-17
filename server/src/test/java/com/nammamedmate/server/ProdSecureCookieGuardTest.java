package com.nammamedmate.server;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.nammamedmate.server.infrastructure.ProdSecureCookieGuard;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class ProdSecureCookieGuardTest {

  @Test
  void rejectsInsecureCookieInProd_SEC_003() {
    ProdSecureCookieGuard guard = new ProdSecureCookieGuard();
    ReflectionTestUtils.setField(guard, "secureCookie", false);

    assertThatThrownBy(guard::failIfInsecure)
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("secure-cookie");
  }

  @Test
  void acceptsSecureCookieInProd_SEC_003() {
    ProdSecureCookieGuard guard = new ProdSecureCookieGuard();
    ReflectionTestUtils.setField(guard, "secureCookie", true);

    assertThatCode(guard::failIfInsecure).doesNotThrowAnyException();
  }
}
