package com.nammamedmate.server.application.notification;

import java.util.UUID;

public record NotificationDraft(
    UUID recipientUserId,
    UUID tenantId,
    UUID branchId,
    String title,
    String body,
    String sourceType,
    UUID sourceId,
    String href) {}
