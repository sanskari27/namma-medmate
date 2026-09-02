package com.nammamedmate.server.application.email;

import com.nammamedmate.server.domain.EmailTemplate;
import java.util.Map;
import java.util.UUID;

public record SendEmailCommand(
    EmailTemplate template,
    String recipient,
    UUID tenantId,
    String pharmacyName,
    Map<String, String> variables,
    String idempotencyKey) {}
