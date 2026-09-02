package com.nammamedmate.server.feature.access;

import com.nammamedmate.server.domain.ModuleCode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record PatchAccessRoleRequest(
    @NotBlank String name, @NotEmpty List<ModuleCode> modules, @NotNull Integer version) {}
