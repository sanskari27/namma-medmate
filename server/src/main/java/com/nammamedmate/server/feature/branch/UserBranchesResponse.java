package com.nammamedmate.server.feature.branch;

import java.util.List;
import java.util.UUID;

public record UserBranchesResponse(UUID userId, List<AssignedBranchResponse> branches) {}
