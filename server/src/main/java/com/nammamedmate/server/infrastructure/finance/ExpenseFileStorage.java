package com.nammamedmate.server.infrastructure.finance;

import com.nammamedmate.server.domain.ExpensePolicy;
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
public class ExpenseFileStorage {

  private static final String PREFIX = "expense/";

  private final ObjectStore objectStore;

  public ExpenseFileStorage(ObjectStore objectStore) {
    this.objectStore = objectStore;
  }

  public String store(UUID tenantId, UUID expenseId, MultipartFile file) {
    String key =
        tenantId + "/" + expenseId + "/" + UUID.randomUUID() + extensionFor(file.getContentType());
    ObjectStore.requireSafeKey(key);
    try (InputStream in = file.getInputStream()) {
      objectStore.put(PREFIX + key, in, file.getSize(), file.getContentType());
    } catch (IOException ex) {
      throw new ApiException(
          HttpStatus.INTERNAL_SERVER_ERROR, "STORAGE_ERROR", "Unable to store receipt");
    }
    return key;
  }

  public Path resolve(String storageKey) {
    try {
      return objectStore.resolve(PREFIX + storageKey);
    } catch (ApiException ex) {
      if ("NOT_FOUND".equals(ex.getCode()) || "VALIDATION_ERROR".equals(ex.getCode())) {
        throw ExpensePolicy.notFound();
      }
      throw ex;
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
