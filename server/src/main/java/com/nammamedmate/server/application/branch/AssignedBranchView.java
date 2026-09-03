package com.nammamedmate.server.application.branch;

import com.nammamedmate.server.domain.BranchStatus;
import java.util.UUID;

public record AssignedBranchView(UUID id, String name, String branchCode, BranchStatus status) {}
