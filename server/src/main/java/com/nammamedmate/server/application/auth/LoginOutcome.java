package com.nammamedmate.server.application.auth;

public record LoginOutcome(AuthenticatedUser user, String accessToken) {}
