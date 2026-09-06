package com.nammamedmate.server.application.campaign;

import com.nammamedmate.server.domain.CampaignStatus;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record CampaignView(
    UUID id,
    UUID tenantId,
    String name,
    CampaignStatus status,
    List<UUID> tagIds,
    String templateUniqueName,
    String namespaceName,
    Map<String, String> variables,
    Instant previewedAt,
    Integer recipientCount,
    Instant frozenAt,
    int version,
    Instant createdAt,
    Instant updatedAt) {}
