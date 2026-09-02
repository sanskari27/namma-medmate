package com.nammamedmate.server.application.staff;

import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.StaffRegistrationKind;

public record CreateStaffCommand(
    String displayName,
    String phone,
    String email,
    String password,
    AppUserRole role,
    StaffRegistrationKind kind,
    String licenseNumber) {}
