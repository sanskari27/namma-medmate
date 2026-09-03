package com.nammamedmate.server.feature.tenant;

import java.util.UUID;

public record TenantRegistrationResponse(UUID tenantId, String email) {}
