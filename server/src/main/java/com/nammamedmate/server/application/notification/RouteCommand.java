package com.nammamedmate.server.application.notification;

import com.nammamedmate.server.domain.NotificationTrigger;
import com.nammamedmate.server.domain.RoutingRole;
import java.util.UUID;

public record RouteCommand(
    String eventKey,
    NotificationTrigger trigger,
    UUID tenantId,
    UUID branchId,
    UUID sourceRecordId,
    UUID affectedUserId,
    RoutingRole approverRole,
    UUID customerId) {}
