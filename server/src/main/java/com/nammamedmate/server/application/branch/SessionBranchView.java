package com.nammamedmate.server.application.branch;

import java.util.List;
import java.util.UUID;

public record SessionBranchView(UUID activeBranchId, List<AssignedBranchView> branches) {}
