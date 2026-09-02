package com.nammamedmate.server.application.access;

import java.util.List;

public record AccessIdentity(List<AccessRoleView> roles, List<String> modules) {}
