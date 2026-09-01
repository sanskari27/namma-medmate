package com.nammamedmate.server;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.nammamedmate.server.infrastructure.LocalEnvironmentGuard;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class LocalEnvironmentGuardTest {

  @Test
  void rejectsRdsDatabaseUrl() {
    LocalEnvironmentGuard guard = new LocalEnvironmentGuard();
    ReflectionTestUtils.setField(
        guard, "databaseUrl", "jdbc:postgresql://foo.rds.amazonaws.com:5432/nammamedmate");
    ReflectionTestUtils.setField(guard, "redisHost", "localhost");

    assertThatThrownBy(guard::failIfPointingAtProd)
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("RDS");
  }
}
