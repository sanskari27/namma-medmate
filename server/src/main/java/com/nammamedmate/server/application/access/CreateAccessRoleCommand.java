package com.nammamedmate.server.application.access;

import com.nammamedmate.server.domain.ModuleCode;
import java.util.List;

public record CreateAccessRoleCommand(String name, List<ModuleCode> modules) {}
