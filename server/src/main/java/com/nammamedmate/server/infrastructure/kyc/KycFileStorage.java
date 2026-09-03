package com.nammamedmate.server.infrastructure.kyc;

import com.nammamedmate.server.shared.exception.ApiException;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

@Component
public class KycFileStorage {

  private final Path root;

  public KycFileStorage(@Value("${nmm.kyc.storage-dir:}") String rootDir) {
    String resolved =
        rootDir == null || rootDir.isBlank()
            ? System.getProperty("java.io.tmpdir") + "/nmm-kyc"
            : rootDir;
    this.root = Path.of(resolved).toAbsolutePath().normalize();
    try {
      Files.createDirectories(this.root);
    } catch (IOException ex) {
      throw new IllegalStateException("Unable to create KYC storage directory", ex);
    }
  }

  public String store(UUID tenantId, UUID submissionId, String docType, MultipartFile file) {
    String key =
        tenantId
            + "/"
            + submissionId
            + "/"
            + docType
            + "-"
            + UUID.randomUUID()
            + extensionFor(file.getContentType());
    Path target = root.resolve(key).normalize();
    if (!target.startsWith(root)) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid storage path");
    }
    try {
      Files.createDirectories(target.getParent());
      try (InputStream in = file.getInputStream()) {
        Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
      }
      return key;
    } catch (IOException ex) {
      throw new ApiException(
          HttpStatus.INTERNAL_SERVER_ERROR, "STORAGE_ERROR", "Unable to store KYC document");
    }
  }

  public Path resolve(String storageKey) {
    Path target = root.resolve(storageKey).normalize();
    if (!target.startsWith(root) || !Files.isRegularFile(target)) {
      throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Document not found");
    }
    return target;
  }

  private static String extensionFor(String contentType) {
    if (contentType == null) {
      return "";
    }
    return switch (contentType) {
      case "application/pdf" -> ".pdf";
      case "image/jpeg" -> ".jpg";
      case "image/png" -> ".png";
      default -> "";
    };
  }
}
