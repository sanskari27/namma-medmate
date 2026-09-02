package com.nammamedmate.server.application.notification;

import com.nammamedmate.server.domain.Notification;
import com.nammamedmate.server.domain.NotificationSource;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.NotificationRepository;
import com.nammamedmate.server.persistence.NotificationSourceRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificationInboxService {

  static final String NOT_FOUND_CODE = "NOTIFICATION_NOT_FOUND";
  static final String NOT_FOUND_MESSAGE = "Notification not found";
  static final String SOURCE_DELETED_CODE = "SOURCE_DELETED";
  static final String SOURCE_DELETED_MESSAGE = "This record is no longer available";
  static final String SOURCE_DENIED_CODE = "SOURCE_DENIED";
  static final String SOURCE_DENIED_MESSAGE = "You no longer have access to this record";
  static final String SOURCE_CONFLICT_CODE = "SOURCE_CONFLICT";
  static final String SOURCE_CONFLICT_MESSAGE = "This record moved. Refresh the list.";

  private final NotificationRepository notificationRepository;
  private final NotificationSourceRepository notificationSourceRepository;
  private final Clock clock;

  public NotificationInboxService(
      NotificationRepository notificationRepository,
      NotificationSourceRepository notificationSourceRepository,
      Clock clock) {
    this.notificationRepository = notificationRepository;
    this.notificationSourceRepository = notificationSourceRepository;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public NotificationPage list(AuthPrincipal principal, int page, int size) {
    Page<Notification> result =
        notificationRepository.findInbox(
            principal.userId(), principal.tenantId(), PageRequest.of(page, size));
    long unread = notificationRepository.countUnread(principal.userId(), principal.tenantId());
    List<NotificationItem> items = result.getContent().stream().map(this::toItem).toList();
    return new NotificationPage(
        items, unread, page, size, result.getTotalPages(), result.getTotalElements());
  }

  @Transactional(readOnly = true)
  public long unreadCount(AuthPrincipal principal) {
    return notificationRepository.countUnread(principal.userId(), principal.tenantId());
  }

  @Transactional
  public NotificationItem markRead(AuthPrincipal principal, UUID notificationId) {
    Notification notification = lockOwned(principal, notificationId);
    if (notification.getReadAt() == null) {
      notification.setReadAt(Instant.now(clock));
      notificationRepository.save(notification);
    }
    return toItem(notification);
  }

  @Transactional
  public NotificationOpenResult open(AuthPrincipal principal, UUID notificationId) {
    Notification notification = lockOwned(principal, notificationId);
    NotificationSource source = loadSource(notification);
    if (source.getDeletedAt() != null) {
      throw new ApiException(HttpStatus.NOT_FOUND, SOURCE_DELETED_CODE, SOURCE_DELETED_MESSAGE);
    }
    if (source.getAccessRevokedAt() != null) {
      throw new ApiException(HttpStatus.FORBIDDEN, SOURCE_DENIED_CODE, SOURCE_DENIED_MESSAGE);
    }
    if (source.getHref() == null
        || source.getHref().isBlank()
        || !source.getHref().equals(notification.getHref())) {
      throw new ApiException(HttpStatus.CONFLICT, SOURCE_CONFLICT_CODE, SOURCE_CONFLICT_MESSAGE);
    }
    if (notification.getReadAt() == null) {
      notification.setReadAt(Instant.now(clock));
      notificationRepository.save(notification);
    }
    return new NotificationOpenResult(
        source.getHref(), notification.getSourceType(), notification.getSourceId());
  }

  private Notification lockOwned(AuthPrincipal principal, UUID notificationId) {
    return notificationRepository
        .lockOwned(notificationId, principal.userId(), principal.tenantId())
        .orElseThrow(
            () -> new ApiException(HttpStatus.NOT_FOUND, NOT_FOUND_CODE, NOT_FOUND_MESSAGE));
  }

  private NotificationSource loadSource(Notification notification) {
    Optional<NotificationSource> found;
    if (notification.getTenantId() == null) {
      found = notificationSourceRepository.findPlatformById(notification.getSourceId());
    } else if (notification.getBranchId() != null) {
      found =
          notificationSourceRepository.findByIdAndTenantIdAndBranchId(
              notification.getSourceId(), notification.getTenantId(), notification.getBranchId());
    } else {
      found =
          notificationSourceRepository.findByIdAndTenantId(
              notification.getSourceId(), notification.getTenantId());
    }
    return found.orElseThrow(
        () -> new ApiException(HttpStatus.NOT_FOUND, SOURCE_DELETED_CODE, SOURCE_DELETED_MESSAGE));
  }

  private NotificationItem toItem(Notification notification) {
    return new NotificationItem(
        notification.getId(),
        notification.getTitle(),
        notification.getBody(),
        notification.getSourceType(),
        notification.getSourceId(),
        notification.getReadAt() != null,
        notification.getCreatedAt());
  }
}
