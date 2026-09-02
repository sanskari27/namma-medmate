package com.nammamedmate.server.feature.notification;

import java.util.UUID;

public record NotificationOpenResponse(String href, String sourceType, UUID sourceId) {}
