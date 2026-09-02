package com.nammamedmate.server.application.email;

public record AdapterSendRequest(
    String recipient, String subject, String html, String idempotencyKey) {}
