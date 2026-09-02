package com.nammamedmate.server.feature.notification;

import java.time.Instant;
import java.util.UUID;

public record NotificationItemResponse(
    UUID id,
    String title,
    String body,
    String sourceType,
    UUID sourceId,
    boolean read,
    Instant createdAt) {}
