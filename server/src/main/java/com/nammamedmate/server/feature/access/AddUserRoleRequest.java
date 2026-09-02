package com.nammamedmate.server.feature.access;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record AddUserRoleRequest(@NotNull UUID roleId) {}
