package com.nammamedmate.server.infrastructure.sales;

import com.nammamedmate.server.shared.exception.ApiException;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

@Component
public class PrescriptionFileStorage {

  private static final Set<String> ALLOWED =
      Set.of("application/pdf", "image/jpeg", "image/png", "image/webp");

  private final Path root;

  public PrescriptionFileStorage(@Value("${nmm.prescription.storage-dir:}") String rootDir) {
    String resolved =
        rootDir == null || rootDir.isBlank()
            ? System.getProperty("java.io.tmpdir") + "/nmm-prescription"
            : rootDir;
    this.root = Path.of(resolved).toAbsolutePath().normalize();
    try {
      Files.createDirectories(this.root);
    } catch (IOException ex) {
      throw new IllegalStateException("Unable to create prescription storage directory", ex);
    }
  }

  public String store(UUID tenantId, UUID invoiceId, MultipartFile file) {
    String contentType = file.getContentType();
    if (contentType == null || !ALLOWED.contains(contentType)) {
      throw new ApiException(
          HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Prescription must be PDF or image");
    }
    if (file.getSize() <= 0 || file.getSize() > 8_000_000) {
      throw new ApiException(
          HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Prescription file must be under 8 MB");
    }
    String key =
        tenantId + "/" + invoiceId + "/" + UUID.randomUUID() + extensionFor(contentType);
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
          HttpStatus.INTERNAL_SERVER_ERROR, "STORAGE_ERROR", "Unable to store prescription");
    }
  }

  public Path resolve(String storageKey) {
    Path target = root.resolve(storageKey).normalize();
    if (!target.startsWith(root) || !Files.isRegularFile(target)) {
      throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Prescription file not found");
    }
    return target;
  }

  private static String extensionFor(String contentType) {
    return switch (contentType) {
      case "application/pdf" -> ".pdf";
      case "image/jpeg" -> ".jpg";
      case "image/png" -> ".png";
      case "image/webp" -> ".webp";
      default -> "";
    };
  }
}
