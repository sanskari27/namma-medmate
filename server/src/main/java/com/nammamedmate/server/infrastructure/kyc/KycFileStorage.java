package com.nammamedmate.server.infrastructure.kyc;

import com.nammamedmate.server.infrastructure.storage.ObjectStore;
import com.nammamedmate.server.shared.exception.ApiException;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Path;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

@Component
public class KycFileStorage {

  private static final String PREFIX = "kyc/";

  private final ObjectStore objectStore;

  public KycFileStorage(ObjectStore objectStore) {
    this.objectStore = objectStore;
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
    put(key, file, "Unable to store KYC document");
    return key;
  }

  public Path resolve(String storageKey) {
    return objectStore.resolve(PREFIX + storageKey);
  }

  private void put(String key, MultipartFile file, String failMessage) {
    try (InputStream in = file.getInputStream()) {
      objectStore.put(PREFIX + key, in, file.getSize(), file.getContentType());
    } catch (IOException ex) {
      throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "STORAGE_ERROR", failMessage);
    }
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
