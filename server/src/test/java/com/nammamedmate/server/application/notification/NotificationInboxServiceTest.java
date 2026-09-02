package com.nammamedmate.server.application.notification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.Notification;
import com.nammamedmate.server.domain.NotificationSource;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.NotificationRepository;
import com.nammamedmate.server.persistence.NotificationSourceRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;

@ExtendWith(MockitoExtension.class)
class NotificationInboxServiceTest {

  private static final Instant NOW = Instant.parse("2026-09-02T00:00:00Z");

  @Mock private NotificationRepository notificationRepository;
  @Mock private NotificationSourceRepository notificationSourceRepository;

  private NotificationInboxService service;
  private AuthPrincipal owner;

  @BeforeEach
  void setUp() {
    service =
        new NotificationInboxService(
            notificationRepository, notificationSourceRepository, Clock.fixed(NOW, ZoneOffset.UTC));
    owner =
        new AuthPrincipal(
            UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), AppUserRole.pharmacy_owner);
  }

  @Test
  void listMapsReadFlagAndUnreadCount() {
    Notification unread = notification(null);
    Notification read = notification(NOW);
    when(notificationRepository.findInbox(owner.userId(), owner.tenantId(), PageRequest.of(0, 20)))
        .thenReturn(new PageImpl<>(List.of(unread, read), PageRequest.of(0, 20), 2));
    when(notificationRepository.countUnread(owner.userId(), owner.tenantId())).thenReturn(1L);

    NotificationPage page = service.list(owner, 0, 20);

    assertThat(page.unreadCount()).isEqualTo(1);
    assertThat(page.items()).hasSize(2);
    assertThat(page.items().get(0).read()).isFalse();
    assertThat(page.items().get(1).read()).isTrue();
  }

  @Test
  void markReadIsIdempotentWhenAlreadyRead() {
    Notification already = notification(NOW.minusSeconds(60));
    when(notificationRepository.lockOwned(already.getId(), owner.userId(), owner.tenantId()))
        .thenReturn(Optional.of(already));

    NotificationItem item = service.markRead(owner, already.getId());

    assertThat(item.read()).isTrue();
    assertThat(already.getReadAt()).isEqualTo(NOW.minusSeconds(60));
    verify(notificationRepository, never()).save(any());
  }

  @Test
  void openBlankHrefConflicts() {
    Notification notification = notification(null);
    NotificationSource source = source(notification);
    source.setHref(" ");
    when(notificationRepository.lockOwned(notification.getId(), owner.userId(), owner.tenantId()))
        .thenReturn(Optional.of(notification));
    when(notificationSourceRepository.findByIdAndTenantId(
            notification.getSourceId(), owner.tenantId()))
        .thenReturn(Optional.of(source));

    assertThatThrownBy(() -> service.open(owner, notification.getId()))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getStatus(), ex -> ((ApiException) ex).getCode())
        .containsExactly(HttpStatus.CONFLICT, "SOURCE_CONFLICT");
    verify(notificationRepository, never()).save(any());
  }

  @Test
  void recorderRejectsBlankTitle() {
    NotificationRecorder recorder =
        new NotificationRecorder(notificationRepository, Clock.fixed(NOW, ZoneOffset.UTC));
    assertThatThrownBy(
            () ->
                recorder.record(
                    new NotificationDraft(
                        owner.userId(),
                        owner.tenantId(),
                        null,
                        "  ",
                        "body",
                        "stock_item",
                        UUID.randomUUID(),
                        "/inventory")))
        .isInstanceOf(ApiException.class);
    verify(notificationRepository, never()).save(any());
  }

  @Test
  void recorderPersistsInboxRow() {
    NotificationRecorder recorder =
        new NotificationRecorder(notificationRepository, Clock.fixed(NOW, ZoneOffset.UTC));
    when(notificationRepository.save(any(Notification.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));
    UUID sourceId = UUID.randomUUID();

    Notification saved =
        recorder.record(
            new NotificationDraft(
                owner.userId(),
                owner.tenantId(),
                null,
                "Low stock",
                "Reorder",
                "stock_item",
                sourceId,
                "/inventory"));

    assertThat(saved.getRecipientUserId()).isEqualTo(owner.userId());
    assertThat(saved.getTenantId()).isEqualTo(owner.tenantId());
    assertThat(saved.getReadAt()).isNull();
    assertThat(saved.getCreatedAt()).isEqualTo(NOW);
    verify(notificationRepository).save(eq(saved));
  }

  private Notification notification(Instant readAt) {
    Notification notification = new Notification();
    notification.setId(UUID.randomUUID());
    notification.setRecipientUserId(owner.userId());
    notification.setTenantId(owner.tenantId());
    notification.setTitle("Low stock");
    notification.setBody("Reorder");
    notification.setSourceType("stock_item");
    notification.setSourceId(UUID.randomUUID());
    notification.setHref("/inventory");
    notification.setReadAt(readAt);
    notification.setCreatedAt(NOW);
    return notification;
  }

  private NotificationSource source(Notification notification) {
    NotificationSource source = new NotificationSource();
    source.setId(notification.getSourceId());
    source.setTenantId(notification.getTenantId());
    source.setHref(notification.getHref());
    source.setCreatedAt(NOW);
    return source;
  }
}
