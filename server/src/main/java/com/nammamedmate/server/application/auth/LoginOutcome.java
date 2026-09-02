package com.nammamedmate.server.application.auth;

import java.util.UUID;

public record LoginOutcome(AuthenticatedUser user, String accessToken, UUID sessionId) {}
