package com.nammamedmate.server.infrastructure.storage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.nammamedmate.server.shared.exception.ApiException;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class ObjectStoreTest {

  @TempDir Path temp;

  @Test
  void ac03_putAndResolveRoundTrip() throws Exception {
    DiskObjectStore store = new DiskObjectStore(temp);
    String key = "kyc/" + UUID.randomUUID() + "/doc.pdf";
    byte[] body = "evidence".getBytes(StandardCharsets.UTF_8);
    store.put(key, new ByteArrayInputStream(body), body.length, "application/pdf");

    Path resolved = store.resolve(key);
    assertThat(Files.readAllBytes(resolved)).isEqualTo(body);
  }

  @Test
  void ac05_rejectsPathTraversal() {
    DiskObjectStore store = new DiskObjectStore(temp);
    byte[] body = "x".getBytes(StandardCharsets.UTF_8);
    assertThatThrownBy(
            () ->
                store.put(
                    "../outside.pdf",
                    new ByteArrayInputStream(body),
                    body.length,
                    "application/pdf"))
        .isInstanceOf(ApiException.class)
        .extracting("code")
        .isEqualTo("VALIDATION_ERROR");
    assertThatThrownBy(() -> store.resolve("kyc/../../etc/passwd"))
        .isInstanceOf(ApiException.class)
        .extracting("code")
        .isEqualTo("VALIDATION_ERROR");
  }

  @Test
  void ac03_missingKeyIsNotFound() {
    DiskObjectStore store = new DiskObjectStore(temp);
    assertThatThrownBy(() -> store.resolve("kyc/" + UUID.randomUUID() + "/missing.pdf"))
        .isInstanceOf(ApiException.class)
        .extracting("code")
        .isEqualTo("NOT_FOUND");
  }
}
