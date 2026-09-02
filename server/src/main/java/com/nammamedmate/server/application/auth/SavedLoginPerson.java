package com.nammamedmate.server.application.auth;

import java.util.UUID;

public record SavedLoginPerson(UUID userId, String displayName, String role, String email) {}
