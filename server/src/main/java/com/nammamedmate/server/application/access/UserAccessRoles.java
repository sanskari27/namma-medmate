package com.nammamedmate.server.application.access;

import java.util.List;
import java.util.UUID;

public record UserAccessRoles(UUID userId, List<AccessRoleView> roles) {}
