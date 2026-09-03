package com.nammamedmate.server.application.customerfamily;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record CustomerFamilyView(
    UUID id, UUID tenantId, String label, List<MemberView> members, Instant createdAt) {

  public record MemberView(UUID id, String name, String phone) {}
}
