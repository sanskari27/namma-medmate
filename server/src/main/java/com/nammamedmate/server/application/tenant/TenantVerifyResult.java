package com.nammamedmate.server.application.tenant;

import java.util.UUID;

public record TenantVerifyResult(UUID tenantId, String email) {}
