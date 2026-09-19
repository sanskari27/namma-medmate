package com.nammamedmate.server.infrastructure.storage;

import java.nio.file.Path;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;

@Configuration
public class ObjectStoreConfiguration {

  @Bean
  ObjectStore objectStore(
      @Value("${nmm.storage.s3.bucket:}") String bucket,
      @Value("${nmm.storage.s3.region:ap-south-1}") String region,
      @Value("${nmm.storage.local-dir:}") String localDir) {
    if (bucket == null || bucket.isBlank()) {
      Path root =
          localDir == null || localDir.isBlank()
              ? Path.of(System.getProperty("java.io.tmpdir"), "nmm-files")
              : Path.of(localDir);
      return new DiskObjectStore(root);
    }
    S3Client client = S3Client.builder().region(Region.of(region)).build();
    return new S3ObjectStore(client, bucket);
  }
}
