package com.nammamedmate.server.infrastructure;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("prod")
public class ProdFilesBucketGuard {

  @Value("${nmm.storage.s3.bucket:}")
  private String bucket;

  @PostConstruct
  public void failIfBucketMissing() {
    if (bucket == null || bucket.isBlank()) {
      throw new IllegalStateException(
          "nmm.storage.s3.bucket / NMM_FILES_BUCKET must be set in prod (private ap-south-1 S3).");
    }
  }
}
