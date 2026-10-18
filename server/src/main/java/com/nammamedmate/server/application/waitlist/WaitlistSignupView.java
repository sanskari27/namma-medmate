package com.nammamedmate.server.application.waitlist;

import java.time.Instant;
import java.util.UUID;

public record WaitlistSignupView(
    UUID id,
    String name,
    String phone,
    String pincode,
    int age,
    String gender,
    boolean consent,
    String source,
    String lang,
    String offer,
    Instant createdAt) {}
