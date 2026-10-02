package com.nammamedmate.server.infrastructure;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("local")
public class LocalEnvironmentGuard {

  @Value("${spring.datasource.url:}")
  private String databaseUrl;

  @Value("${nmm.storage.s3.bucket:}")
  private String filesBucket;

  @PostConstruct
  public void failIfPointingAtProd() {
    if (databaseUrl != null && databaseUrl.contains("rds.amazonaws.com")) {
      throw new IllegalStateException(
          "Local profile must not use RDS. Use compose postgres or localhost:25432.");
    }
    if (filesBucket != null && !filesBucket.isBlank()) {
      throw new IllegalStateException(
          "Local profile must not use S3. Leave NMM_FILES_BUCKET blank and use disk storage.");
    }
  }
}
