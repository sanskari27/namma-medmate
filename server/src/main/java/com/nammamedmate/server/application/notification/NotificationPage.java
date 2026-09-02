package com.nammamedmate.server.application.notification;

import java.util.List;

public record NotificationPage(
    List<NotificationItem> items,
    long unreadCount,
    int page,
    int size,
    int totalPages,
    long totalItems) {}
