package com.nammamedmate.server.feature.branch;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record AddUserBranchRequest(@NotNull UUID branchId) {}
