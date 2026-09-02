package com.nammamedmate.server.feature.auth;

import com.nammamedmate.server.application.auth.SavedLoginPerson;
import java.util.List;

public record SavedLoginsResponse(List<SavedLoginPerson> items) {}
