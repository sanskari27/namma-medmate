package com.nammamedmate.server.feature.session;

import com.nammamedmate.server.feature.branch.AssignedBranchResponse;
import java.util.List;
import java.util.UUID;

public record SessionBranchResponse(UUID activeBranchId, List<AssignedBranchResponse> branches) {}
