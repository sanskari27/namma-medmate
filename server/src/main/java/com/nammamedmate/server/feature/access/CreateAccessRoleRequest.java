package com.nammamedmate.server.feature.access;

import com.nammamedmate.server.domain.ModuleCode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record CreateAccessRoleRequest(@NotBlank String name, @NotEmpty List<ModuleCode> modules) {}
