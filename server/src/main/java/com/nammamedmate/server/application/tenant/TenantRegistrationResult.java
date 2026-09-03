package com.nammamedmate.server.application.tenant;

import java.util.UUID;

public record TenantRegistrationResult(UUID tenantId, String email) {}
