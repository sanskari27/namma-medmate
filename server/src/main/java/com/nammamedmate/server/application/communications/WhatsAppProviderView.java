package com.nammamedmate.server.application.communications;

import java.time.Instant;

public record WhatsAppProviderView(
    String displayNumber, String phoneNumberId, String health, Instant syncedAt) {}
