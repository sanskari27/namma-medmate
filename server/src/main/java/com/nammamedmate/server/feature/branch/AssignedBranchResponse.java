package com.nammamedmate.server.feature.branch;

import java.util.UUID;

public record AssignedBranchResponse(UUID id, String name, String branchCode, String status) {}
