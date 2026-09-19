package com.nammamedmate.server.infrastructure.storage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectResponse;

class S3ObjectStoreTest {

  @Test
  void ac01_putUsesConfiguredBucketAndKey() {
    S3Client s3 = mock(S3Client.class);
    when(s3.putObject(any(PutObjectRequest.class), any(RequestBody.class)))
        .thenReturn(PutObjectResponse.builder().build());
    S3ObjectStore store = new S3ObjectStore(s3, "namma-medmate-prod-files");
    byte[] body = "kyc".getBytes(StandardCharsets.UTF_8);

    store.put("kyc/tenant/doc.pdf", new ByteArrayInputStream(body), body.length, "application/pdf");

    ArgumentCaptor<PutObjectRequest> captor = ArgumentCaptor.forClass(PutObjectRequest.class);
    verify(s3).putObject(captor.capture(), any(RequestBody.class));
    assertThat(captor.getValue().bucket()).isEqualTo("namma-medmate-prod-files");
    assertThat(captor.getValue().key()).isEqualTo("kyc/tenant/doc.pdf");
    assertThat(store.bucket()).isEqualTo("namma-medmate-prod-files");
  }
}
