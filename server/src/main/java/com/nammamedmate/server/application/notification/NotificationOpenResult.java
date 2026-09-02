package com.nammamedmate.server.application.notification;

import java.util.UUID;

public record NotificationOpenResult(String href, String sourceType, UUID sourceId) {}
