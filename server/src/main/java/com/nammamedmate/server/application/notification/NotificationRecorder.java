package com.nammamedmate.server.application.notification;

import com.nammamedmate.server.domain.Notification;
import com.nammamedmate.server.persistence.NotificationRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificationRecorder {

  private final NotificationRepository notificationRepository;
  private final Clock clock;

  public NotificationRecorder(NotificationRepository notificationRepository, Clock clock) {
    this.notificationRepository = notificationRepository;
    this.clock = clock;
  }

  @Transactional
  public Notification record(NotificationDraft draft) {
    if (draft.recipientUserId() == null
        || draft.title() == null
        || draft.title().isBlank()
        || draft.sourceType() == null
        || draft.sourceType().isBlank()
        || draft.sourceId() == null
        || draft.href() == null
        || draft.href().isBlank()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
    Notification notification = new Notification();
    notification.setId(UUID.randomUUID());
    notification.setRecipientUserId(draft.recipientUserId());
    notification.setTenantId(draft.tenantId());
    notification.setBranchId(draft.branchId());
    notification.setTitle(draft.title());
    notification.setBody(draft.body());
    notification.setSourceType(draft.sourceType());
    notification.setSourceId(draft.sourceId());
    notification.setHref(draft.href());
    notification.setCreatedAt(Instant.now(clock));
    return notificationRepository.save(notification);
  }
}
