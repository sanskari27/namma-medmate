package com.nammamedmate.server.feature.notification;

import java.util.List;

public record NotificationListResponse(
    List<NotificationItemResponse> items,
    long unreadCount,
    int page,
    int size,
    int totalPages,
    long totalItems) {}
