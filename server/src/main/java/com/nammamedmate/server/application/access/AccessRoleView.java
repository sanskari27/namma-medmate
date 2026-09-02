package com.nammamedmate.server.application.access;

import com.nammamedmate.server.domain.AccessRoleKind;
import com.nammamedmate.server.domain.AccessScope;
import java.util.List;
import java.util.UUID;

public record AccessRoleView(
    UUID id,
    String name,
    String code,
    AccessRoleKind kind,
    AccessScope scope,
    int version,
    List<String> modules) {}
