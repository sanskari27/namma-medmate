package com.nammamedmate.server.application.finance;

import java.util.UUID;

public record ExpenseCategoryView(UUID id, UUID tenantId, String code, String label, boolean system) {}
