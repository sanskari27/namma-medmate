package com.nammamedmate.server.application.campaign;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public record CampaignCommand(
    String name, List<UUID> tagIds, String templateUniqueName, Map<String, String> variables) {}
