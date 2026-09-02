package com.nammamedmate.server.feature.access;

import java.util.List;
import java.util.UUID;

public record ReplaceUserRolesRequest(List<UUID> roleIds) {}
