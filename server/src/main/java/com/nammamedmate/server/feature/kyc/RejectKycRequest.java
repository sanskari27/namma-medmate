package com.nammamedmate.server.feature.kyc;

import jakarta.validation.constraints.NotBlank;

public record RejectKycRequest(@NotBlank String reason) {}
