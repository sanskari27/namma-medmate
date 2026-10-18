package com.nammamedmate.server.application.waitlist;

public record WaitlistJoin(
    String name,
    String phone,
    String pincode,
    Integer age,
    String gender,
    Boolean consent,
    String source,
    String lang,
    String offer,
    String companyWebsite) {}
