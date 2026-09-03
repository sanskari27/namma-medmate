package com.nammamedmate.server.application.branch;

import java.util.List;
import java.util.UUID;

public record UserBranches(UUID userId, List<AssignedBranchView> branches) {}
