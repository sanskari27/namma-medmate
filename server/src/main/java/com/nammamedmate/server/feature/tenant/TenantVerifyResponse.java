package com.nammamedmate.server.feature.tenant;

import java.util.UUID;

public record TenantVerifyResponse(UUID tenantId, String email) {}
