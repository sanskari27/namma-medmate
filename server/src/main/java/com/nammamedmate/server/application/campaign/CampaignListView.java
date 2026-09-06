package com.nammamedmate.server.application.campaign;

import java.util.List;
import java.util.UUID;

public record CampaignListView(
    List<CampaignView> items, List<TagOption> tags, List<TemplateOption> templates) {

  public record TagOption(UUID id, String name) {}

  public record TemplateOption(String uniqueName, String namespaceName, String status) {}
}
