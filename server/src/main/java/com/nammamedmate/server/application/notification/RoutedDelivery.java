package com.nammamedmate.server.application.notification;

import com.nammamedmate.server.domain.DeliveryChannel;
import java.util.UUID;

public record RoutedDelivery(
    String recipientKey, DeliveryChannel channel, UUID recipientUserId, UUID notificationId) {}
