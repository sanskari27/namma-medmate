package com.nammamedmate.server.feature.staff;

import jakarta.validation.constraints.NotBlank;

public record ApproveStaffRequest(@NotBlank String evidenceReference) {}
