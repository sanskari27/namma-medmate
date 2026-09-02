package com.nammamedmate.server.feature.notification;

import com.nammamedmate.server.application.notification.NotificationInboxService;
import com.nammamedmate.server.application.notification.NotificationItem;
import com.nammamedmate.server.application.notification.NotificationOpenResult;
import com.nammamedmate.server.application.notification.NotificationPage;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.shared.web.ApiResponse;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/notifications")
@Validated
public class NotificationController {

  private final NotificationInboxService notificationInboxService;

  public NotificationController(NotificationInboxService notificationInboxService) {
    this.notificationInboxService = notificationInboxService;
  }

  @GetMapping
  public ApiResponse<NotificationListResponse> list(
      Authentication authentication,
      @RequestParam(defaultValue = "0") @Min(0) int page,
      @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    NotificationPage result = notificationInboxService.list(principal, page, size);
    return ApiResponse.ok(
        new NotificationListResponse(
            result.items().stream().map(NotificationController::toItem).toList(),
            result.unreadCount(),
            result.page(),
            result.size(),
            result.totalPages(),
            result.totalItems()));
  }

  @GetMapping("/unread-count")
  public ApiResponse<UnreadCountResponse> unreadCount(Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(new UnreadCountResponse(notificationInboxService.unreadCount(principal)));
  }

  @PostMapping("/{id}/read")
  public ApiResponse<NotificationItemResponse> markRead(
      Authentication authentication, @PathVariable UUID id) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toItem(notificationInboxService.markRead(principal, id)));
  }

  @PostMapping("/{id}/open")
  public ApiResponse<NotificationOpenResponse> open(
      Authentication authentication, @PathVariable UUID id) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    NotificationOpenResult result = notificationInboxService.open(principal, id);
    return ApiResponse.ok(
        new NotificationOpenResponse(result.href(), result.sourceType(), result.sourceId()));
  }

  private static NotificationItemResponse toItem(NotificationItem item) {
    return new NotificationItemResponse(
        item.id(),
        item.title(),
        item.body(),
        item.sourceType(),
        item.sourceId(),
        item.read(),
        item.createdAt());
  }
}
