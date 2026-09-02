package com.nammamedmate.server.feature.access;

import com.nammamedmate.server.application.access.AccessRoleView;
import java.util.List;
import java.util.UUID;

public record UserRolesResponse(UUID userId, List<AccessRoleView> roles) {}
