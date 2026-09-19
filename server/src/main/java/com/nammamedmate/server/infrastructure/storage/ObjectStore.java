package com.nammamedmate.server.infrastructure.storage;

import com.nammamedmate.server.shared.exception.ApiException;
import java.io.InputStream;
import java.nio.file.Path;
import org.springframework.http.HttpStatus;

public interface ObjectStore {

  void put(String key, InputStream body, long contentLength, String contentType);

  Path resolve(String key);

  static void requireSafeKey(String key) {
    if (key == null
        || key.isBlank()
        || key.startsWith("/")
        || key.contains("..")
        || key.contains("\\")) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid storage path");
    }
  }

  static ApiException storageError(String message) {
    return new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "STORAGE_ERROR", message);
  }

  static ApiException notFound() {
    return new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Document not found");
  }
}
