package com.nammamedmate.server.application.notification;

import java.util.List;
import java.util.UUID;

public record RouteResult(UUID eventId, boolean alreadyRouted, List<RoutedDelivery> deliveries) {}
