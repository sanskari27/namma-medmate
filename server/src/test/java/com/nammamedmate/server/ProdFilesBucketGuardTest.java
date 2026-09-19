package com.nammamedmate.server;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.nammamedmate.server.infrastructure.ProdFilesBucketGuard;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class ProdFilesBucketGuardTest {

  @Test
  void ac04_prodFailsWithoutBucket() {
    ProdFilesBucketGuard guard = new ProdFilesBucketGuard();
    ReflectionTestUtils.setField(guard, "bucket", " ");
    assertThatThrownBy(guard::failIfBucketMissing)
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("NMM_FILES_BUCKET");
  }

  @Test
  void ac04_prodAcceptsBucketName() {
    ProdFilesBucketGuard guard = new ProdFilesBucketGuard();
    ReflectionTestUtils.setField(guard, "bucket", "namma-medmate-prod-files-123");
    assertThatCode(guard::failIfBucketMissing).doesNotThrowAnyException();
  }
}
