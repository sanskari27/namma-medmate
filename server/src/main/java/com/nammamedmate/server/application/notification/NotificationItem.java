package com.nammamedmate.server.application.notification;

import java.time.Instant;
import java.util.UUID;

public record NotificationItem(
    UUID id,
    String title,
    String body,
    String sourceType,
    UUID sourceId,
    boolean read,
    Instant createdAt) {}
