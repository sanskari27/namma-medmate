package com.nammamedmate.server.application.email;

import com.nammamedmate.server.domain.EmailDeliveryStatus;
import java.util.UUID;

public record SendEmailResult(
    UUID id, EmailDeliveryStatus status, String providerMessageId, boolean replayed) {}
