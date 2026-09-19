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
    ReflectionTestUtils.setField(guard, "filesBucket", "");

    assertThatThrownBy(guard::failIfPointingAtProd)
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("RDS");
  }

  @Test
  void ac02_rejectsFilesBucketOnLocal() {
    LocalEnvironmentGuard guard = new LocalEnvironmentGuard();
    ReflectionTestUtils.setField(
        guard, "databaseUrl", "jdbc:postgresql://localhost:25432/nammamedmate");
    ReflectionTestUtils.setField(guard, "redisHost", "localhost");
    ReflectionTestUtils.setField(guard, "filesBucket", "namma-medmate-prod-files");

    assertThatThrownBy(guard::failIfPointingAtProd)
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("S3");
  }
}
