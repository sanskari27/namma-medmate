package com.nammamedmate.server.infrastructure.storage;

import com.nammamedmate.server.shared.exception.ApiException;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import org.springframework.http.HttpStatus;

public class DiskObjectStore implements ObjectStore {

  private final Path root;

  public DiskObjectStore(Path root) {
    this.root = root.toAbsolutePath().normalize();
    try {
      Files.createDirectories(this.root);
    } catch (IOException ex) {
      throw new IllegalStateException("Unable to create local file storage directory", ex);
    }
  }

  @Override
  public void put(String key, InputStream body, long contentLength, String contentType) {
    Path target = safeTarget(key);
    try {
      Files.createDirectories(target.getParent());
      Files.copy(body, target, StandardCopyOption.REPLACE_EXISTING);
    } catch (IOException ex) {
      throw ObjectStore.storageError("Unable to store document");
    }
  }

  @Override
  public Path resolve(String key) {
    Path target = safeTarget(key);
    if (!Files.isRegularFile(target)) {
      throw ObjectStore.notFound();
    }
    return target;
  }

  private Path safeTarget(String key) {
    ObjectStore.requireSafeKey(key);
    Path target = root.resolve(key).normalize();
    if (!target.startsWith(root)) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid storage path");
    }
    return target;
  }
}
