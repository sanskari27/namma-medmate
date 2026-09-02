package com.nammamedmate.server.application.email;

import com.nammamedmate.server.domain.EmailDeliveryStatus;

public record AdapterSendResult(EmailDeliveryStatus status, String providerMessageId) {}
