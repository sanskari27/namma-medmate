package com.nammamedmate.server.application.customerrefill;

import java.time.Instant;
import java.util.UUID;

public record CustomerTagView(UUID id, String name, Instant createdAt) {}
