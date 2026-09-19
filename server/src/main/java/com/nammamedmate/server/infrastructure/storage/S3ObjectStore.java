package com.nammamedmate.server.infrastructure.storage;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.core.sync.ResponseTransformer;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;

public class S3ObjectStore implements ObjectStore {

  private final S3Client s3;
  private final String bucket;

  public S3ObjectStore(S3Client s3, String bucket) {
    this.s3 = s3;
    this.bucket = bucket;
  }

  public String bucket() {
    return bucket;
  }

  @Override
  public void put(String key, InputStream body, long contentLength, String contentType) {
    ObjectStore.requireSafeKey(key);
    try {
      PutObjectRequest.Builder request =
          PutObjectRequest.builder().bucket(bucket).key(key).contentLength(contentLength);
      if (contentType != null && !contentType.isBlank()) {
        request.contentType(contentType);
      }
      s3.putObject(request.build(), RequestBody.fromInputStream(body, contentLength));
    } catch (S3Exception ex) {
      throw ObjectStore.storageError("Unable to store document");
    }
  }

  @Override
  public Path resolve(String key) {
    ObjectStore.requireSafeKey(key);
    try {
      Path temp = Files.createTempFile("nmm-s3-", ".bin");
      s3.getObject(
          GetObjectRequest.builder().bucket(bucket).key(key).build(),
          ResponseTransformer.toFile(temp));
      return temp;
    } catch (NoSuchKeyException ex) {
      throw ObjectStore.notFound();
    } catch (S3Exception | IOException ex) {
      throw ObjectStore.notFound();
    }
  }
}
