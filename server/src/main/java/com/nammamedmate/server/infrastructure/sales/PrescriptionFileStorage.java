package com.nammamedmate.server.infrastructure.sales;

import com.nammamedmate.server.infrastructure.storage.ObjectStore;
import com.nammamedmate.server.shared.exception.ApiException;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Path;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

@Component
public class PrescriptionFileStorage {

  private static final Set<String> ALLOWED =
      Set.of("application/pdf", "image/jpeg", "image/png", "image/webp");
  private static final String PREFIX = "prescription/";

  private final ObjectStore objectStore;

  public PrescriptionFileStorage(ObjectStore objectStore) {
    this.objectStore = objectStore;
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
    String key = tenantId + "/" + invoiceId + "/" + UUID.randomUUID() + extensionFor(contentType);
    try (InputStream in = file.getInputStream()) {
      objectStore.put(PREFIX + key, in, file.getSize(), contentType);
    } catch (IOException ex) {
      throw new ApiException(
          HttpStatus.INTERNAL_SERVER_ERROR, "STORAGE_ERROR", "Unable to store prescription");
    }
    return key;
  }

  public Path resolve(String storageKey) {
    return objectStore.resolve(PREFIX + storageKey);
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
